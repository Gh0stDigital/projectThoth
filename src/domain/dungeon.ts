import type { AssetCategory } from '@/config/assets'
import type { DungeonEventType, DungeonTierId } from '@/config/balance'
import type { Challenge } from './challenge'

export interface DungeonConfig {
  totemId: string
  totemSpellSetId: string
  dungeonSpellSetId: string
  tierId: DungeonTierId
  /** Resolved word pool for this run (capped to the tier's word limit). */
  dungeonWordIds: string[]
}

export interface DungeonEvent {
  id: string
  type: DungeonEventType
  title: string
  /** Sequential lines shown in the typewriter area. */
  bodyText: string[]
  imageCategory: AssetCategory
  imageKey: string
  challenge: Challenge | null
  /** Actions the player may take to resolve this event. */
  actions: DungeonEventAction[]
}

export type DungeonEventAction = 'proceed' | 'attempt' | 'flee' | 'enter_boss' | 'skip'

export interface RunStats {
  eventsEncountered: number
  monstersDefeated: number
  treasureCollected: number
  moneyEarned: number
  totemXpEarned: number
  spellXpEarned: number
  correctAnswers: number
  incorrectAnswers: number
  spellLevelUps: { spellId: string; from: number; to: number }[]
  newlyMasteredWords: string[]
  bossDefeated: boolean
  floorCompleted: boolean
}

export function createEmptyRunStats(): RunStats {
  return {
    eventsEncountered: 0,
    monstersDefeated: 0,
    treasureCollected: 0,
    moneyEarned: 0,
    totemXpEarned: 0,
    spellXpEarned: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    spellLevelUps: [],
    newlyMasteredWords: [],
    bossDefeated: false,
    floorCompleted: false,
  }
}

export type DungeonPhase =
  | 'exploring'
  | 'event'
  | 'challenge'
  | 'resolution'
  | 'battle'
  | 'boss_battle'
  | 'results'

export interface DungeonRunState {
  config: DungeonConfig
  challengedWordIds: string[]
  eventHistory: DungeonEventType[]
  bossUnlocked: boolean
  bossRoomAnnounced: boolean
  currentEvent: DungeonEvent | null
  phase: DungeonPhase
  lastOutcomeText: string[]
  stats: RunStats
  startedAt: string
}
