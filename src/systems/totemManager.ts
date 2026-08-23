import type { Totem } from '@/domain/totem'
import { totemBalance } from '@/config/balance'
import { makeId } from './idGen'
import { pickFlavor } from '@/config/assets'

export function createTotem(name: string): Totem {
  const level = 1
  return {
    id: makeId('totem'),
    name: name.trim() || 'Totem',
    avatarKey: pickFlavor('totems', name || makeId('seed')).split('/').pop()!.replace('.png', ''),
    level,
    experience: 0,
    currentHp: totemBalance.maxHp(level),
    maxHp: totemBalance.maxHp(level),
    money: 0,
    equippedSpellSetId: null,
    stats: {
      dungeonsCompleted: 0,
      bossesDefeated: 0,
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
