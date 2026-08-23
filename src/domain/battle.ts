import type { AssetCategory } from '@/config/assets'
import type { Challenge } from './challenge'

export type BattlePhase =
  | 'player_select'
  | 'player_challenge'
  | 'player_resolve'
  | 'enemy_intro'
  | 'enemy_challenge'
  | 'enemy_resolve'
  | 'victory'
  | 'defeat'

export interface EnemyCombatant {
  kind: 'enemy' | 'boss'
  name: string
  imageCategory: AssetCategory
  imageKey: string
  battleBgKey: string
  maxHp: number
  currentHp: number
  damage: number
}

export interface PlateauRequirement {
  spellId: string
  cleared: boolean
}

/** Ordered spell-id deck. Only card order lives here — never vocabulary data. */
export interface DeckState {
  order: string[]
}

export interface TimerState {
  totalSeconds: number
  remainingSeconds: number
  running: boolean
}

export interface BattleState {
  enemy: EnemyCombatant
  isBoss: boolean
  /** Non-null only for boss battles; empty array once fully cleared. */
  plateau: PlateauRequirement[] | null
  deck: DeckState
  phase: BattlePhase
  activeChallenge: Challenge | null
  timer: TimerState | null
  log: string[]
  totemDamageTakenThisBattle: number
  /** Result of the most recently resolved challenge, for UI feedback styling. */
  lastResult: 'correct' | 'incorrect' | null
}

export function isPlateauCleared(plateau: PlateauRequirement[] | null): boolean {
  if (!plateau) return true
  return plateau.every((r) => r.cleared)
}
