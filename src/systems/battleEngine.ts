import type { Spell } from '@/domain/spell'
import type { BattleState, EnemyCombatant, PlateauRequirement } from '@/domain/battle'
import type { Challenge } from '@/domain/challenge'
import { battleBalance, type DungeonTierDef } from '@/config/balance'
import { pickFlavor } from '@/config/assets'
import { buildDeck, playCard, visibleCards } from './deck'
import { generateChallenge, resolveChallenge, type ChallengeResolution } from './challengeEngine'
import { buildPlateau, clearRequirement, isFullyCleared } from './bossPlateau'
import { damageForSpell } from './spellProgression'
import { makeId } from './idGen'

/**
 * Turn-based battle state machine. Pure functions only — React components
 * and the dungeon store call these and re-render from the returned state.
 * Vocabulary data (Spells) is always passed in by the caller; this module
 * never reads or writes the Compendium directly.
 */

function keyOf(url: string): string {
  return url.split('/').pop()!.replace('.png', '')
}

export function spawnEnemy(seed: string, tier: DungeonTierDef): EnemyCombatant {
  const hp = 26 + Math.round(tier.enemyDamageMultiplier * 10)
  return {
    kind: 'enemy',
    name: 'Wandering Foe',
    imageCategory: 'enemies',
    imageKey: keyOf(pickFlavor('enemies', seed)),
    battleBgKey: keyOf(pickFlavor('battlebg', seed)),
    maxHp: hp,
    currentHp: hp,
    damage: Math.round(battleBalance.baseEnemyDamage * tier.enemyDamageMultiplier),
  }
}

export function spawnBoss(seed: string, tier: DungeonTierDef, wordCount: number): EnemyCombatant {
  const hp = battleBalance.bossBaseHp + wordCount * battleBalance.bossHpPerWord
  return {
    kind: 'boss',
    name: 'Boss Guardian',
    imageCategory: 'bosses',
    imageKey: keyOf(pickFlavor('bosses', seed)),
    battleBgKey: 'boss',
    maxHp: hp,
    currentHp: hp,
    damage: Math.round(battleBalance.baseEnemyDamage * 1.4 * tier.enemyDamageMultiplier),
  }
}

export function startBattle(
  enemy: EnemyCombatant,
  totemDeckSpellIds: string[],
  dungeonWordIds: string[] | null,
): BattleState {
  const isBoss = enemy.kind === 'boss'
  return {
    enemy,
    isBoss,
    plateau: isBoss && dungeonWordIds ? buildPlateau(dungeonWordIds) : null,
    deck: buildDeck(totemDeckSpellIds),
    phase: 'player_select',
    activeChallenge: null,
    timer: null,
    log: [isBoss ? 'The boss blocks your path!' : 'A foe appears!'],
    totemDamageTakenThisBattle: 0,
    lastResult: null,
  }
}

export function visibleHand(state: BattleState, count: number = battleBalance.visibleHandSize): string[] {
  return visibleCards(state.deck, count)
}

export function beginPlayerChallenge(state: BattleState, spell: Spell): BattleState {
  // Attacks always present the saved English meaning and ask for the Korean Spell Word.
  const challenge = generateChallenge(spell, 'attack', 'eng_to_kor')
  return { ...state, phase: 'player_challenge', activeChallenge: challenge, lastResult: null }
}

export interface AttackOutcome {
  state: BattleState
  resolution: ChallengeResolution
  damageDealt: number
  plateauCleared: boolean
}

/** Resolves the player's attack submission. Advances the deck either way. */
export function resolvePlayerAttack(state: BattleState, spell: Spell, submitted: string): AttackOutcome {
  const challenge = state.activeChallenge as Challenge
  const resolution = resolveChallenge(spell, challenge, submitted, 'attack')

  let plateau = state.plateau
  let plateauCleared = false
  let damageDealt = 0
  let enemy = state.enemy

  if (resolution.correct) {
    const plateauActive = state.isBoss && plateau && !isFullyCleared(plateau)
    if (plateauActive && plateau!.some((r) => r.spellId === spell.id && !r.cleared)) {
      plateau = clearRequirement(plateau!, spell.id)
      plateauCleared = true
    }
    const stillBlocked = state.isBoss && plateau && !isFullyCleared(plateau)
    if (!stillBlocked) {
      damageDealt = damageForSpell(resolution.spell)
      enemy = { ...enemy, currentHp: Math.max(0, enemy.currentHp - damageDealt) }
    }
  }

  const deck = playCard(state.deck, spell.id)
  const log = [
    ...state.log,
    resolution.correct
      ? damageDealt > 0
        ? `${spell.korean} lands for ${damageDealt} damage!`
        : `${spell.korean} strikes true, but the Plateau absorbs it.`
      : `You mistranslate "${challenge.prompt}" — the attack fizzles.`,
  ]

  const nextPhase = enemy.currentHp <= 0 ? 'victory' : 'player_resolve'

  return {
    state: {
      ...state,
      enemy,
      deck,
      plateau,
      phase: nextPhase,
      activeChallenge: null,
      log,
      lastResult: resolution.correct ? 'correct' : 'incorrect',
    },
    resolution,
    damageDealt,
    plateauCleared,
  }
}

export function beginEnemyChallenge(
  state: BattleState,
  dungeonSpells: Spell[],
  timerSeconds: number,
  rng: () => number = Math.random,
): BattleState {
  const pool = dungeonSpells.length > 0 ? dungeonSpells : []
  if (pool.length === 0) {
    return { ...state, phase: 'enemy_intro', activeChallenge: null, timer: null }
  }
  const spell = pool[Math.floor(rng() * pool.length)]
  const challenge = generateChallenge(spell, 'defense', 'kor_to_eng')
  return {
    ...state,
    phase: 'enemy_challenge',
    activeChallenge: challenge,
    timer: { totalSeconds: timerSeconds, remainingSeconds: timerSeconds, running: true },
    lastResult: null,
  }
}

export function tickTimer(state: BattleState, deltaSeconds: number): BattleState {
  if (!state.timer || !state.timer.running) return state
  const remainingSeconds = Math.max(0, state.timer.remainingSeconds - deltaSeconds)
  return { ...state, timer: { ...state.timer, remainingSeconds } }
}

export function setTimerRunning(state: BattleState, running: boolean): BattleState {
  if (!state.timer) return state
  return { ...state, timer: { ...state.timer, running } }
}

export interface DefenseOutcome {
  state: BattleState
  resolution: ChallengeResolution
  damageToTotem: number
  plateauCleared: boolean
}

export function resolveEnemyAttack(
  state: BattleState,
  spell: Spell,
  submitted: string,
  timedOut: boolean,
): DefenseOutcome {
  const challenge = state.activeChallenge as Challenge
  const resolution = timedOut
    ? forceIncorrect(spell, challenge)
    : resolveChallenge(spell, challenge, submitted, 'defense')

  let plateau = state.plateau
  let plateauCleared = false
  if (resolution.correct && state.isBoss && plateau) {
    const req = plateau.find((r) => r.spellId === spell.id && !r.cleared)
    if (req) {
      plateau = clearRequirement(plateau, spell.id)
      plateauCleared = true
    }
  }

  const damageToTotem = resolution.correct
    ? Math.round(state.enemy.damage * battleBalance.defendedDamageFraction)
    : state.enemy.damage

  const log = [
    ...state.log,
    resolution.correct
      ? `You correctly recall "${challenge.prompt}" and block most of the damage.`
      : timedOut
        ? `Too slow! "${challenge.prompt}" goes unanswered — full damage taken.`
        : `Incorrect meaning for "${challenge.prompt}" — full damage taken.`,
  ]

  return {
    state: {
      ...state,
      plateau,
      phase: 'enemy_resolve',
      activeChallenge: null,
      timer: null,
      totemDamageTakenThisBattle: state.totemDamageTakenThisBattle + damageToTotem,
      log,
      lastResult: resolution.correct ? 'correct' : 'incorrect',
    },
    resolution,
    damageToTotem,
    plateauCleared,
  }
}

function forceIncorrect(spell: Spell, challenge: Challenge): ChallengeResolution {
  // Re-use resolveChallenge's stat bookkeeping by submitting a value that
  // can never match, guaranteeing an "incorrect" result on timeout.
  return resolveChallenge(spell, challenge, `__timeout__${makeId('x')}`, 'defense')
}

export function returnToPlayerTurn(state: BattleState): BattleState {
  if (state.enemy.currentHp <= 0) return { ...state, phase: 'victory' }
  return { ...state, phase: 'player_select' }
}

export function markDefeat(state: BattleState): BattleState {
  return { ...state, phase: 'defeat' }
}

export function plateauRequirements(state: BattleState): PlateauRequirement[] {
  return state.plateau ?? []
}
