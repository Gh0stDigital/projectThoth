/**
 * Central balance configuration.
 *
 * Every tunable number in the game lives here (or is derived from these
 * values) instead of being scattered through UI components or systems.
 * Formulas are intentionally simple and deterministic for the prototype —
 * tune the constants, not the code that reads them.
 */

// ---------------------------------------------------------------------------
// Spell progression
// ---------------------------------------------------------------------------

export const spellBalance = {
  /** Spell level cannot exceed this in the prototype. */
  maxLevel: 20,
  /** XP required to go from level N to N+1 = base + perLevel * N. */
  xpToNextLevel(level: number): number {
    return 20 + level * 12
  },
  /** Charge cap grows with level. */
  maxCharge(level: number): number {
    return 5 + (level - 1) * 2
  },
  /** Charge gained on a correct answer. */
  chargeGainOnCorrect: 1,
  /** Charge lost on an incorrect answer (never below 0). */
  chargeLossOnIncorrect: 2,
  /** Base damage a spell can deal, before charge multiplier. */
  baseDamage(level: number): number {
    return 8 + level * 3
  },
  /**
   * Charge multiplier applied to base damage. 0 charge = 50% damage,
   * full charge = 150% damage. Linear in between.
   */
  chargeDamageMultiplier(charge: number, maxCharge: number): number {
    const ratio = maxCharge > 0 ? charge / maxCharge : 0
    return 0.5 + ratio
  },
  /** XP granted for a correct general-vocabulary challenge. */
  xpPerCorrectChallenge: 6,
  /** XP granted for a correct attack in battle. */
  xpPerCorrectAttack: 8,
  /** XP granted for a correct defense in battle. */
  xpPerCorrectDefense: 8,
  /** XP granted for a correct Plateau-clearing answer (on top of the above). */
  xpPerPlateauClear: 4,
  /** A Spell reaching this level during a run counts as "newly mastered" for results reporting. */
  masteryLevel: 3,
}

// ---------------------------------------------------------------------------
// Totem progression
// ---------------------------------------------------------------------------

export const totemBalance = {
  maxLevel: 50,
  xpToNextLevel(level: number): number {
    return 40 + level * 20
  },
  maxHp(level: number): number {
    return 40 + (level - 1) * 8
  },
  /** XP a Totem earns from a resolved dungeon event or battle action. */
  xpPerEvent: 4,
  xpPerBattleWin: 25,
  xpPerBossWin: 80,
}

// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------

export const rewardBalance = {
  /** Base money for a successful treasure / event outcome. */
  baseMoney: 8,
  /** Bonus money multiplier when the answering spell is at full charge. */
  fullChargeMoneyBonus: 1.5,
  /** Money reduced to this fraction when a treasure/event is only partly resolved. */
  partialRewardFraction: 0.4,
  bossMoneyReward: 60,
  bossXpReward: 80,
}

// ---------------------------------------------------------------------------
// Dungeon tiers
// ---------------------------------------------------------------------------

export type DungeonTierId = 'tier10' | 'tier25' | 'tier50'

export interface DungeonTierDef {
  id: DungeonTierId
  label: string
  wordLimit: number
  /** Roughly how many non-boss events occur before the boss room can spawn. */
  minEventsBeforeBossEligible: number
  /** Multiplies enemy/trap damage for this tier. */
  enemyDamageMultiplier: number
}

export const dungeonTiers: DungeonTierDef[] = [
  {
    id: 'tier10',
    label: '10-Word Dungeon',
    wordLimit: 10,
    minEventsBeforeBossEligible: 6,
    enemyDamageMultiplier: 1,
  },
  {
    id: 'tier25',
    label: '25-Word Dungeon',
    wordLimit: 25,
    minEventsBeforeBossEligible: 12,
    enemyDamageMultiplier: 1.25,
  },
  {
    id: 'tier50',
    label: '50-Word Dungeon',
    wordLimit: 50,
    minEventsBeforeBossEligible: 20,
    enemyDamageMultiplier: 1.6,
  },
]

// ---------------------------------------------------------------------------
// Battle
// ---------------------------------------------------------------------------

export const battleBalance = {
  /** Number of spell cards visible in the player's hand at once. */
  visibleHandSize: 3,
  /** Default seconds the player has to answer an enemy attack. Configurable for a11y/testing. */
  defaultEnemyTimerSeconds: 12,
  /** Base enemy attack damage before tier multiplier. */
  baseEnemyDamage: 6,
  /** Damage dealt to the player when correctly defending (heavily reduced, not zero). */
  defendedDamageFraction: 0.15,
  /** Boss base HP, before per-word-pool scaling. */
  bossBaseHp: 80,
  /** Additional boss HP per word in the dungeon pool. */
  bossHpPerWord: 4,
}

// ---------------------------------------------------------------------------
// Random events
// ---------------------------------------------------------------------------

export type DungeonEventType =
  | 'empty'
  | 'branch'
  | 'trap'
  | 'treasure'
  | 'shrine'
  | 'rest'
  | 'discovery'
  | 'monster'
  | 'special'

export const eventWeights: Record<DungeonEventType, number> = {
  empty: 10,
  branch: 10,
  trap: 14,
  treasure: 14,
  shrine: 8,
  rest: 8,
  discovery: 12,
  monster: 26,
  special: 6,
}

/** Never allow the same event type to appear more than this many times in a row. */
export const maxRepeatEventStreak = 2

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export const gameplayBalance = {
  /** Minimum notes-free Spell fields required to save. */
  requireNotes: false,
}
