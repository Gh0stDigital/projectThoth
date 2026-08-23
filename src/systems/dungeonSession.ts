import type { Spell } from '@/domain/spell'
import type {
  DungeonConfig,
  DungeonEvent,
  DungeonRunState,
  RoomKind,
} from '@/domain/dungeon'
import { createEmptyRunStats } from '@/domain/dungeon'
import type { DungeonTierDef } from '@/config/balance'
import { rewardBalance, battleBalance, spellBalance } from '@/config/balance'
import { pickNextEventType } from './eventGenerator'
import { eventDefinitions, bossRoomDefinition } from './eventContent'
import { generateChallenge, resolveChallenge, type ChallengeResolution } from './challengeEngine'
import { moneyReward } from './spellProgression'
import { makeId } from './idGen'

/**
 * Builds a DungeonConfig, capping the resolved word pool to the tier's
 * word limit. If the chosen Dungeon Spell Set has more words than the
 * tier allows, a random subset is used.
 */
export function buildDungeonConfig(
  totemId: string,
  totemSpellSetId: string,
  dungeonSpellSetId: string,
  dungeonSpellSetWordIds: string[],
  tier: DungeonTierDef,
  rng: () => number = Math.random,
): DungeonConfig {
  let pool = [...dungeonSpellSetWordIds]
  if (pool.length > tier.wordLimit) {
    // Fisher-Yates partial shuffle down to the limit.
    for (let i = pool.length - 1; i > pool.length - 1 - tier.wordLimit && i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    pool = pool.slice(0, tier.wordLimit)
  }
  return {
    totemId,
    totemSpellSetId,
    dungeonSpellSetId,
    tierId: tier.id,
    dungeonWordIds: pool,
    // Always the single default location backdrop for now — kept as a
    // config field (rather than a hardcoded constant in the UI) so a
    // per-tier or randomized location can be swapped in later without
    // touching the screens that render it.
    locationKey: 'default',
  }
}

export function startDungeon(config: DungeonConfig): DungeonRunState {
  return {
    config,
    challengedWordIds: [],
    eventHistory: [],
    bossUnlocked: false,
    bossRoomAnnounced: false,
    currentEvent: null,
    // A run opens in the entrance room, where the player chooses an action
    // rather than being dropped straight into a generated event.
    phase: 'room',
    roomKind: 'entrance',
    roomNotice: null,
    lastOutcomeText: [],
    stats: createEmptyRunStats(),
    startedAt: new Date().toISOString(),
  }
}

/**
 * Returns the player to a room between events. `notice` surfaces a
 * one-line result (an item used, a drop found) in the room itself.
 */
export function enterRoom(
  run: DungeonRunState,
  kind: RoomKind = 'intermission',
  notice: string | null = null,
): DungeonRunState {
  return { ...run, phase: 'room', roomKind: kind, roomNotice: notice, currentEvent: null }
}

export function setRoomNotice(run: DungeonRunState, notice: string | null): DungeonRunState {
  return { ...run, roomNotice: notice }
}

function pickRandomSpell(spells: Spell[], rng: () => number): Spell {
  return spells[Math.floor(rng() * spells.length)]
}

/** True once every word in the Dungeon Spell Set pool has been challenged. */
export function allWordsChallenged(run: DungeonRunState): boolean {
  const pool = new Set(run.config.dungeonWordIds)
  return [...pool].every((id) => run.challengedWordIds.includes(id))
}

export function markWordChallenged(run: DungeonRunState, spellId: string): DungeonRunState {
  if (run.challengedWordIds.includes(spellId)) return run
  const challengedWordIds = [...run.challengedWordIds, spellId]
  const bossUnlocked =
    run.bossUnlocked || run.config.dungeonWordIds.every((id) => challengedWordIds.includes(id))
  return { ...run, challengedWordIds, bossUnlocked }
}

export interface NextEventResult {
  run: DungeonRunState
  event: DungeonEvent
}

/**
 * Generates the next dungeon event. If the boss has just unlocked and
 * hasn't been announced yet, the boss-room-discovery event takes priority
 * over the normal weighted roll.
 */
export function generateNextEvent(
  run: DungeonRunState,
  dungeonSpells: Spell[],
  rng: () => number = Math.random,
): NextEventResult {
  if (run.bossUnlocked && !run.bossRoomAnnounced) {
    const event: DungeonEvent = {
      id: makeId('evt'),
      type: bossRoomDefinition.type,
      title: bossRoomDefinition.title,
      bodyText: bossRoomDefinition.bodyText,
      imageCategory: bossRoomDefinition.imageCategory,
      imageKey: bossRoomDefinition.imageKey,
      challenge: null,
      actions: bossRoomDefinition.actions,
    }
    return {
      run: { ...run, currentEvent: event, phase: 'event', roomNotice: null, bossRoomAnnounced: true },
      event,
    }
  }

  const type = pickNextEventType(run.eventHistory, rng)
  const def = eventDefinitions[type]
  const spell = dungeonSpells.length > 0 ? pickRandomSpell(dungeonSpells, rng) : null
  const challenge = def.hasChallenge && spell ? generateChallenge(spell, def.challengeContext) : null

  const event: DungeonEvent = {
    id: makeId('evt'),
    type,
    title: def.title,
    bodyText: def.bodyText,
    imageCategory: def.imageCategory,
    imageKey: def.imageKey,
    challenge,
    actions: def.actions,
  }

  const run2: DungeonRunState = {
    ...run,
    currentEvent: event,
    phase: 'event',
    roomNotice: null,
    eventHistory: [...run.eventHistory, type],
    stats: { ...run.stats, eventsEncountered: run.stats.eventsEncountered + 1 },
  }

  return { run: run2, event }
}

export interface RewardOutcome {
  moneyDelta: number
  healFraction: number
  damageToTotem: number
  resultText: string
}

/** Resolves a non-challenge, non-monster event (empty/branch/rest). */
export function resolveSafeEvent(run: DungeonRunState, event: DungeonEvent): { run: DungeonRunState; reward: RewardOutcome } {
  const reward: RewardOutcome =
    event.type === 'rest'
      ? { moneyDelta: 0, healFraction: 0.15, damageToTotem: 0, resultText: 'You rest and recover a little strength.' }
      : { moneyDelta: 0, healFraction: 0, damageToTotem: 0, resultText: 'Nothing more happens here.' }
  return { run: { ...run, phase: 'resolution' }, reward }
}

export interface ChallengeEventOutcome {
  run: DungeonRunState
  resolution: ChallengeResolution
  reward: RewardOutcome
}

/** Resolves an event that required a vocabulary challenge (trap/treasure/shrine/discovery/special). */
export function resolveChallengeEvent(
  run: DungeonRunState,
  tier: DungeonTierDef,
  event: DungeonEvent,
  spell: Spell,
  submitted: string,
): ChallengeEventOutcome {
  const challenge = event.challenge!
  const resolution = resolveChallenge(spell, challenge, submitted, 'challenge')

  let reward: RewardOutcome
  const base = rewardBalance.baseMoney
  switch (event.type) {
    case 'trap':
      reward = resolution.correct
        ? { moneyDelta: 0, healFraction: 0, damageToTotem: 0, resultText: 'You disarm the trap safely.' }
        : {
            moneyDelta: 0,
            healFraction: 0,
            damageToTotem: Math.round(battleBalance.baseEnemyDamage * 0.8 * tier.enemyDamageMultiplier),
            resultText: 'The trap triggers! You take damage.',
          }
      break
    case 'treasure':
      reward = resolution.correct
        ? { moneyDelta: moneyReward(resolution.spell, base), healFraction: 0, damageToTotem: 0, resultText: 'The lock clicks open — treasure claimed!' }
        : { moneyDelta: 0, healFraction: 0, damageToTotem: 0, resultText: 'The lock holds fast. The chest stays shut.' }
      break
    case 'shrine':
      reward = resolution.correct
        ? { moneyDelta: 0, healFraction: 0.25, damageToTotem: 0, resultText: 'Warmth flows through you — HP restored.' }
        : { moneyDelta: 0, healFraction: 0, damageToTotem: 0, resultText: 'The shrine stays silent.' }
      break
    case 'discovery':
      reward = resolution.correct
        ? { moneyDelta: moneyReward(resolution.spell, base * 0.6), healFraction: 0, damageToTotem: 0, resultText: 'You pocket a small find.' }
        : { moneyDelta: Math.round(base * rewardBalance.partialRewardFraction * 0.6), healFraction: 0, damageToTotem: 0, resultText: 'You find only scraps.' }
      break
    case 'special':
    default:
      reward = resolution.correct
        ? { moneyDelta: moneyReward(resolution.spell, base * 1.3), healFraction: 0, damageToTotem: 0, resultText: 'The strange energy rewards your correct recall!' }
        : { moneyDelta: Math.round(base * rewardBalance.partialRewardFraction), healFraction: 0, damageToTotem: 0, resultText: 'The moment passes, mostly wasted.' }
      break
  }

  let run2 = markWordChallenged(run, spell.id)
  run2 = {
    ...run2,
    phase: 'resolution',
    stats: {
      ...run2.stats,
      correctAnswers: run2.stats.correctAnswers + (resolution.correct ? 1 : 0),
      incorrectAnswers: run2.stats.incorrectAnswers + (resolution.correct ? 0 : 1),
      spellXpEarned: run2.stats.spellXpEarned + resolution.xpGained,
      moneyEarned: run2.stats.moneyEarned + reward.moneyDelta,
      treasureCollected: run2.stats.treasureCollected + (event.type === 'treasure' && resolution.correct ? 1 : 0),
    },
  }

  return { run: run2, resolution, reward }
}

export function recordMonsterDefeated(run: DungeonRunState): DungeonRunState {
  return { ...run, stats: { ...run.stats, monstersDefeated: run.stats.monstersDefeated + 1 } }
}

export function recordBossDefeated(run: DungeonRunState): DungeonRunState {
  return { ...run, stats: { ...run.stats, bossDefeated: true, floorCompleted: true } }
}

export function addSpellXp(run: DungeonRunState, amount: number): DungeonRunState {
  return { ...run, stats: { ...run.stats, spellXpEarned: run.stats.spellXpEarned + amount } }
}

export function addTotemXp(run: DungeonRunState, amount: number): DungeonRunState {
  return { ...run, stats: { ...run.stats, totemXpEarned: run.stats.totemXpEarned + amount } }
}

export function addMoneyEarned(run: DungeonRunState, amount: number): DungeonRunState {
  return { ...run, stats: { ...run.stats, moneyEarned: run.stats.moneyEarned + amount } }
}

export function recordLevelUp(run: DungeonRunState, spellId: string, from: number, to: number): DungeonRunState {
  if (to <= from) return run
  const crossedMastery = from < spellBalance.masteryLevel && to >= spellBalance.masteryLevel
  return {
    ...run,
    stats: {
      ...run.stats,
      spellLevelUps: [...run.stats.spellLevelUps, { spellId, from, to }],
      newlyMasteredWords:
        crossedMastery && !run.stats.newlyMasteredWords.includes(spellId)
          ? [...run.stats.newlyMasteredWords, spellId]
          : run.stats.newlyMasteredWords,
    },
  }
}

export function recordCorrect(run: DungeonRunState, correct: boolean): DungeonRunState {
  return {
    ...run,
    stats: {
      ...run.stats,
      correctAnswers: run.stats.correctAnswers + (correct ? 1 : 0),
      incorrectAnswers: run.stats.incorrectAnswers + (correct ? 0 : 1),
    },
  }
}
