import type { Totem } from '@/domain/totem'
import { totemBalance } from '@/config/balance'
import { makeId } from './idGen'

export function createTotem(name: string): Totem {
  const level = 1
  return {
    id: makeId('totem'),
    name: name.trim() || 'Totem',
    // Every Totem starts on the 'default' avatar for now — only that slot
    // is guaranteed to have real art. Flip this back to a pickFlavor(...)
    // roll once every totems/* key has its own artwork.
    avatarKey: 'default',
    level,
    experience: 0,
    currentHp: totemBalance.maxHp(level),
    maxHp: totemBalance.maxHp(level),
    money: 0,
    lifePoints: totemBalance.startingLifePoints,
    maxLifePoints: totemBalance.startingLifePoints,
    destroyed: false,
    equippedSpellSetId: null,
    stats: {
      dungeonsCompleted: 0,
      bossesDefeated: 0,
      dungeonsFailed: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
    },
    createdAt: new Date().toISOString(),
  }
}

export interface TotemLevelUpResult {
  totem: Totem
  leveledUp: boolean
  fromLevel: number
  toLevel: number
}

export function addTotemExperience(totem: Totem, amount: number): TotemLevelUpResult {
  if (amount <= 0) return { totem, leveledUp: false, fromLevel: totem.level, toLevel: totem.level }
  let level = totem.level
  let experience = totem.experience + amount
  const fromLevel = level
  while (level < totemBalance.maxLevel && experience >= totemBalance.xpToNextLevel(level)) {
    experience -= totemBalance.xpToNextLevel(level)
    level += 1
  }
  const newMax = totemBalance.maxHp(level)
  const hpGain = newMax - totemBalance.maxHp(fromLevel)
  const next: Totem = {
    ...totem,
    level,
    experience,
    maxHp: newMax,
    // Leveling up heals by the HP gained, but never past the new max, and
    // never heals a totem that's mid-battle beyond what makes sense.
    currentHp: Math.min(newMax, totem.currentHp + Math.max(0, hpGain)),
  }
  return { totem: next, leveledUp: level > fromLevel, fromLevel, toLevel: level }
}

export function equipSpellSet(totem: Totem, spellSetId: string | null): Totem {
  return { ...totem, equippedSpellSetId: spellSetId }
}

export function addMoney(totem: Totem, amount: number): Totem {
  return { ...totem, money: Math.max(0, totem.money + amount) }
}

export function applyDamage(totem: Totem, amount: number): Totem {
  const currentHp = Math.max(0, totem.currentHp - Math.max(0, Math.round(amount)))
  return {
    ...totem,
    currentHp,
    stats: { ...totem.stats, totalDamageTaken: totem.stats.totalDamageTaken + Math.max(0, Math.round(amount)) },
  }
}

export function heal(totem: Totem, amount: number): Totem {
  return { ...totem, currentHp: Math.min(totem.maxHp, totem.currentHp + Math.max(0, Math.round(amount))) }
}

export function fullyRestore(totem: Totem): Totem {
  return { ...totem, currentHp: totem.maxHp }
}

export function recordDamageDealt(totem: Totem, amount: number): Totem {
  return { ...totem, stats: { ...totem.stats, totalDamageDealt: totem.stats.totalDamageDealt + Math.max(0, amount) } }
}

// ---------------------------------------------------------------------------
// Life Points
// ---------------------------------------------------------------------------

export interface LifeLossResult {
  totem: Totem
  /** False when no Life Point was actually deducted (already at 0). */
  lifePointLost: boolean
  /** True only on the transition into permanent destruction. */
  becameDestroyed: boolean
}

/**
 * Applies a dungeon defeat: exactly one Life Point, never more, and never
 * from a totem that has already run out. At 0 the Totem is permanently
 * destroyed. HP is restored to full so a surviving Totem isn't left stuck
 * at 0 HP and unable to enter another dungeon.
 */
export function loseLifePoint(totem: Totem): LifeLossResult {
  if (totem.destroyed || totem.lifePoints <= 0) {
    return { totem: { ...totem, destroyed: true, lifePoints: 0 }, lifePointLost: false, becameDestroyed: false }
  }
  const lifePoints = totem.lifePoints - 1
  const destroyed = lifePoints <= 0
  return {
    totem: {
      ...totem,
      lifePoints,
      destroyed,
      // A destroyed Totem stays at 0 HP as a memorial; a surviving one is
      // patched up so the next run can actually begin.
      currentHp: destroyed ? 0 : totem.maxHp,
      stats: { ...totem.stats, dungeonsFailed: totem.stats.dungeonsFailed + 1 },
    },
    lifePointLost: true,
    becameDestroyed: destroyed,
  }
}

/** A Totem that can still be taken into a dungeon. */
export function isUsable(totem: Totem): boolean {
  return !totem.destroyed && totem.lifePoints > 0
}

export function spendMoney(totem: Totem, amount: number): Totem {
  return { ...totem, money: Math.max(0, totem.money - Math.max(0, Math.round(amount))) }
}
