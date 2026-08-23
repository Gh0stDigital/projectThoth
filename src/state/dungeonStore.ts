import { create } from 'zustand'
import type { Spell } from '@/domain/spell'
import type { DungeonConfig, DungeonEventAction, DungeonRunState, RunStats } from '@/domain/dungeon'
import type { BattleState } from '@/domain/battle'
import type { ItemId } from '@/domain/item'
import { dungeonTiers, totemBalance, rewardBalance } from '@/config/balance'
import { getItemDef, itemBalance } from '@/config/items'
import {
  startDungeon,
  generateNextEvent,
  resolveSafeEvent,
  resolveChallengeEvent,
  markWordChallenged,
  recordLevelUp,
  recordMonsterDefeated,
  recordBossDefeated,
  addTotemXp,
  addMoneyEarned,
  enterRoom,
} from '@/systems/dungeonSession'
import {
  startBattle,
  spawnEnemy,
  spawnBoss,
  beginPlayerChallenge,
  resolvePlayerAttack,
  beginEnemyChallenge,
  resolveEnemyAttack,
  tickTimer as engineTickTimer,
  returnToPlayerTurn,
  markDefeat,
} from '@/systems/battleEngine'
import { grantPlateauBonusXp } from '@/systems/spellCompendium'
import { applyItemToSpells, applyItemToTotem, countOf, itemUseText, rollItemDrop } from '@/systems/inventory'
import { addMoney, applyDamage, heal, addTotemExperience } from '@/systems/totemManager'
import { usePersistentStore } from './persistentStore'

function findSpell(spells: Spell[], id: string): Spell {
  const s = spells.find((sp) => sp.id === id)
  if (!s) throw new Error(`Spell ${id} not found`)
  return s
}

function resolveSpells(ids: string[], allSpells: Spell[]): Spell[] {
  return ids.map((id) => allSpells.find((s) => s.id === id)).filter((s): s is Spell => !!s)
}

/** Words in the pool that have actually been challenged (ignores stray entries). */
export function challengedCount(run: DungeonRunState): number {
  return run.config.dungeonWordIds.filter((id) => run.challengedWordIds.includes(id)).length
}

/** Which slide-over panel is open on top of the dungeon, if any. */
export type DungeonPanel = 'words' | 'items' | 'status'

interface DungeonStore {
  screenPhase: 'config' | 'run' | 'results'
  run: DungeonRunState | null
  battle: BattleState | null
  activePanel: DungeonPanel | null
  resultsStats: RunStats | null

  beginDungeon(config: DungeonConfig): void
  chooseEventAction(action: DungeonEventAction): void
  submitEventChallengeAnswer(text: string): void
  continueExploring(): void

  /** Room actions: leave the room and roll the next event. */
  moveToNextEvent(): void
  /** Room action: go straight into the boss fight (once unlocked). */
  enterBossFromRoom(): void
  useItem(itemId: ItemId): void

  selectCard(spellId: string): void
  submitAttackAnswer(text: string): void
  continueAfterPlayerResolve(): void
  tickBattleTimer(deltaSeconds: number): void
  submitDefenseAnswer(text: string): void
  triggerDefenseTimeout(): void
  continueAfterEnemyResolve(): void
  continueAfterVictory(): void
  continueAfterDefeat(): void

  openPanel(panel: DungeonPanel): void
  closePanel(): void
  toggleWordInfo(): void
  exitToMenu(): void
}

function grantTotemXp(totemId: string, amount: number) {
  usePersistentStore.getState().replaceTotem(totemId, (t) => addTotemExperience(t, amount).totem)
}

export const useDungeonStore = create<DungeonStore>()((set, get) => ({
  screenPhase: 'config',
  run: null,
  battle: null,
  activePanel: null,
  resultsStats: null,

  beginDungeon(config) {
    // startDungeon() already opens in the entrance room — the first event
    // is only rolled once the player chooses to Move.
    const run = startDungeon(config)
    set({ run, battle: null, screenPhase: 'run', resultsStats: null, activePanel: null })
  },

  chooseEventAction(action) {
    const { run, battle } = get()
    if (!run || !run.currentEvent || run.phase !== 'event' || battle) return
    const event = run.currentEvent

    if (action === 'attempt' && event.type === 'monster') {
      const tier = dungeonTiers.find((t) => t.id === run.config.tierId)!
      const totemSet = usePersistentStore.getState().spellSets.find((s) => s.id === run.config.totemSpellSetId)
      const enemy = spawnEnemy(event.id, tier)
      const battle = startBattle(enemy, totemSet?.spellIds ?? [], null)
      set({ run: { ...run, phase: 'battle' }, battle })
      return
    }

    if (action === 'attempt' && event.challenge) {
      set({ run: { ...run, phase: 'challenge' } })
      return
    }

    if (action === 'enter_boss') {
      const tier = dungeonTiers.find((t) => t.id === run.config.tierId)!
      const totemSet = usePersistentStore.getState().spellSets.find((s) => s.id === run.config.totemSpellSetId)
      const boss = spawnBoss(event.id, tier, run.config.dungeonWordIds.length)
      const battle = startBattle(boss, totemSet?.spellIds ?? [], run.config.dungeonWordIds)
      set({ run: { ...run, phase: 'boss_battle' }, battle })
      return
    }

    // 'proceed' (safe event / boss-room "keep exploring") or 'flee' (monster)
    if (action === 'flee') {
      grantTotemXp(run.config.totemId, totemBalance.xpPerEvent)
      set({ run: { ...run, phase: 'resolution', lastOutcomeText: ['You slip away without a fight.'] } })
      return
    }
    const { run: run2, reward } = resolveSafeEvent(run, event)
    applyReward(run.config.totemId, reward)
    grantTotemXp(run.config.totemId, totemBalance.xpPerEvent)
    set({ run: { ...run2, lastOutcomeText: [reward.resultText] } })
  },

  submitEventChallengeAnswer(text) {
    const { run } = get()
    if (!run || !run.currentEvent || !run.currentEvent.challenge || run.phase !== 'challenge') return
    const event = run.currentEvent
    const tier = dungeonTiers.find((t) => t.id === run.config.tierId)!
    const spell = findSpell(usePersistentStore.getState().spells, event.challenge!.spellId)

    const { run: run2, resolution, reward } = resolveChallengeEvent(run, tier, event, spell, text)
    usePersistentStore.getState().replaceSpells((spells) => spells.map((s) => (s.id === resolution.spell.id ? resolution.spell : s)))
    applyReward(run.config.totemId, reward)
    grantTotemXp(run.config.totemId, totemBalance.xpPerEvent)

    let run3 = run2
    if (resolution.leveledUp.leveledUp) {
      run3 = recordLevelUp(run3, spell.id, resolution.leveledUp.fromLevel, resolution.leveledUp.toLevel)
    }

    // A successfully-opened treasure may also yield a consumable.
    const outcomeLines = [resolution.correct ? 'Correct!' : 'Incorrect.', reward.resultText]
    if (event.type === 'treasure' && resolution.correct && Math.random() < itemBalance.treasureDropChance) {
      const dropped = rollItemDrop()
      if (dropped) {
        const def = getItemDef(dropped)
        usePersistentStore.getState().grantItem(dropped)
        outcomeLines.push(`${def.icon} You also found a ${def.name}!`)
      }
    }

    run3 = { ...run3, lastOutcomeText: outcomeLines }
    set({ run: run3 })
  },

  continueExploring() {
    const { run } = get()
    if (!run) return
    set({ run: enterRoom(run, 'intermission') })
  },

  moveToNextEvent() {
    const { run, battle } = get()
    if (!run || battle || run.phase !== 'room') return
    const dungeonSpells = resolveSpells(run.config.dungeonWordIds, usePersistentStore.getState().spells)
    const { run: run2 } = generateNextEvent({ ...run, phase: 'exploring' }, dungeonSpells)
    set({ run: run2 })
  },

  enterBossFromRoom() {
    const { run, battle } = get()
    if (!run || battle || run.phase !== 'room' || !run.bossUnlocked) return
    const tier = dungeonTiers.find((t) => t.id === run.config.tierId)!
    const totemSet = usePersistentStore.getState().spellSets.find((s) => s.id === run.config.totemSpellSetId)
    const boss = spawnBoss(`boss-${run.startedAt}`, tier, run.config.dungeonWordIds.length)
    const bossBattle = startBattle(boss, totemSet?.spellIds ?? [], run.config.dungeonWordIds)
    set({ run: { ...run, phase: 'boss_battle', bossRoomAnnounced: true, roomNotice: null }, battle: bossBattle })
  },

  useItem(itemId) {
    const { run } = get()
    if (!run || run.phase !== 'room') return
    const store = usePersistentStore.getState()
    if (countOf(store.inventory, itemId) <= 0) return

    const def = getItemDef(itemId)
    store.replaceTotem(run.config.totemId, (t) => applyItemToTotem(t, def))
    if (def.effect.kind === 'charge') {
      const deckIds = store.spellSets.find((s) => s.id === run.config.totemSpellSetId)?.spellIds ?? []
      store.replaceSpells((spells) => applyItemToSpells(spells, deckIds, def))
    }
    store.consumeItem(itemId)
    set({ run: { ...run, roomNotice: itemUseText(def) }, activePanel: null })
  },

  selectCard(spellId) {
    const { battle } = get()
    if (!battle || battle.phase !== 'player_select') return
    const spell = findSpell(usePersistentStore.getState().spells, spellId)
    set({ battle: beginPlayerChallenge(battle, spell) })
  },

  submitAttackAnswer(text) {
    const { battle, run } = get()
    if (!battle || !run || battle.phase !== 'player_challenge' || !battle.activeChallenge) return
    const spellId = battle.activeChallenge.spellId
    const spell = findSpell(usePersistentStore.getState().spells, spellId)

    const outcome = resolvePlayerAttack(battle, spell, text)
    let finalSpell = outcome.resolution.spell
    let totalXp = outcome.resolution.xpGained
    let fromLevel = outcome.resolution.leveledUp.fromLevel
    let toLevel = outcome.resolution.leveledUp.toLevel

    if (outcome.plateauCleared) {
      const bonus = grantPlateauBonusXp(finalSpell)
      finalSpell = bonus.spell
      totalXp += bonus.xpGained
      toLevel = bonus.leveledUp.toLevel
    }

    usePersistentStore.getState().replaceSpells((spells) => spells.map((s) => (s.id === finalSpell.id ? finalSpell : s)))

    let run2 = markWordChallenged(run, spellId)
    if (toLevel > fromLevel) run2 = recordLevelUp(run2, spellId, fromLevel, toLevel)
    run2 = {
      ...run2,
      stats: {
        ...run2.stats,
        correctAnswers: run2.stats.correctAnswers + (outcome.resolution.correct ? 1 : 0),
        incorrectAnswers: run2.stats.incorrectAnswers + (outcome.resolution.correct ? 0 : 1),
        spellXpEarned: run2.stats.spellXpEarned + totalXp,
      },
    }
    set({ battle: outcome.state, run: run2 })
  },

  continueAfterPlayerResolve() {
    const { battle, run } = get()
    if (!battle || !run) return
    if (battle.phase === 'victory') {
      get().continueAfterVictory()
      return
    }
    const dungeonSpells = resolveSpells(run.config.dungeonWordIds, usePersistentStore.getState().spells)
    const timerSeconds = usePersistentStore.getState().settings.enemyTimerSeconds
    set({ battle: beginEnemyChallenge(battle, dungeonSpells, timerSeconds) })
  },

  tickBattleTimer(deltaSeconds) {
    const { battle } = get()
    if (!battle || !battle.timer || !battle.timer.running) return
    const next = engineTickTimer(battle, deltaSeconds)
    set({ battle: next })
    if (next.timer && next.timer.remainingSeconds <= 0) {
      get().triggerDefenseTimeout()
    }
  },

  submitDefenseAnswer(text) {
    resolveDefense(set, get, text, false)
  },

  triggerDefenseTimeout() {
    resolveDefense(set, get, '', true)
  },

  continueAfterEnemyResolve() {
    const { battle } = get()
    if (!battle) return
    if (battle.phase === 'defeat') {
      get().continueAfterDefeat()
      return
    }
    set({ battle: returnToPlayerTurn(battle) })
  },

  continueAfterVictory() {
    const { battle, run } = get()
    if (!battle || !run) return
    const totemId = run.config.totemId

    if (battle.isBoss) {
      let run2 = recordBossDefeated(run)
      run2 = addTotemXp(run2, totemBalance.xpPerBossWin)
      run2 = addMoneyEarned(run2, rewardBalance.bossMoneyReward)
      for (let i = 0; i < itemBalance.bossDropCount; i++) {
        const dropped = rollItemDrop()
        if (dropped) usePersistentStore.getState().grantItem(dropped)
      }
      usePersistentStore.getState().replaceTotem(totemId, (t) => {
        const leveled = addTotemExperience(t, totemBalance.xpPerBossWin)
        const withMoney = addMoney(leveled.totem, rewardBalance.bossMoneyReward)
        return {
          ...withMoney,
          stats: {
            ...withMoney.stats,
            bossesDefeated: withMoney.stats.bossesDefeated + 1,
            dungeonsCompleted: withMoney.stats.dungeonsCompleted + 1,
          },
        }
      })
      set({ battle: null, run: null, screenPhase: 'results', resultsStats: run2.stats })
      return
    }

    const run2 = recordMonsterDefeated(run)
    grantTotemXp(totemId, totemBalance.xpPerBattleWin)
    set({
      battle: null,
      run: { ...run2, phase: 'resolution', lastOutcomeText: ['The foe falls. You catch your breath.'] },
    })
  },

  continueAfterDefeat() {
    set({ battle: null, run: null, screenPhase: 'config', resultsStats: null })
  },

  openPanel(panel) {
    set({ activePanel: panel })
  },
  closePanel() {
    set({ activePanel: null })
  },
  toggleWordInfo() {
    set((s) => ({ activePanel: s.activePanel === 'words' ? null : 'words' }))
  },

  exitToMenu() {
    set({ screenPhase: 'config', run: null, battle: null, resultsStats: null, activePanel: null })
  },
}))

function applyReward(totemId: string, reward: { moneyDelta: number; healFraction: number; damageToTotem: number }) {
  usePersistentStore.getState().replaceTotem(totemId, (t) => {
    let next = t
    if (reward.moneyDelta) next = addMoney(next, reward.moneyDelta)
    if (reward.healFraction) next = heal(next, Math.round(next.maxHp * reward.healFraction))
    if (reward.damageToTotem) next = applyDamage(next, reward.damageToTotem)
    return next
  })
}

function resolveDefense(
  set: (partial: Partial<DungeonStore>) => void,
  get: () => DungeonStore,
  text: string,
  timedOut: boolean,
) {
  const { battle, run } = get()
  if (!battle || !run || battle.phase !== 'enemy_challenge' || !battle.activeChallenge) return
  const spellId = battle.activeChallenge.spellId
  const spell = findSpell(usePersistentStore.getState().spells, spellId)

  const outcome = resolveEnemyAttack(battle, spell, text, timedOut)
  let finalSpell = outcome.resolution.spell
  let totalXp = outcome.resolution.xpGained
  let fromLevel = outcome.resolution.leveledUp.fromLevel
  let toLevel = outcome.resolution.leveledUp.toLevel

  if (outcome.plateauCleared) {
    const bonus = grantPlateauBonusXp(finalSpell)
    finalSpell = bonus.spell
    totalXp += bonus.xpGained
    toLevel = bonus.leveledUp.toLevel
  }

  usePersistentStore.getState().replaceSpells((spells) => spells.map((s) => (s.id === finalSpell.id ? finalSpell : s)))

  let run2 = markWordChallenged(run, spellId)
  if (toLevel > fromLevel) run2 = recordLevelUp(run2, spellId, fromLevel, toLevel)
  run2 = {
    ...run2,
    stats: {
      ...run2.stats,
      correctAnswers: run2.stats.correctAnswers + (outcome.resolution.correct ? 1 : 0),
      incorrectAnswers: run2.stats.incorrectAnswers + (outcome.resolution.correct ? 0 : 1),
      spellXpEarned: run2.stats.spellXpEarned + totalXp,
    },
  }

  let battleAfterDamage = outcome.state
  if (outcome.damageToTotem > 0) {
    let becameDefeated = false
    usePersistentStore.getState().replaceTotem(run.config.totemId, (t) => {
      const next = applyDamage(t, outcome.damageToTotem)
      if (next.currentHp <= 0) becameDefeated = true
      return next
    })
    if (becameDefeated) battleAfterDamage = markDefeat(battleAfterDamage)
  }

  set({ battle: battleAfterDamage, run: run2 })
}
