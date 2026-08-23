/**
 * A Totem is the player's controllable dungeon character.
 */
export interface Totem {
  id: string
  name: string
  avatarKey: string

  level: number
  experience: number
  currentHp: number
  maxHp: number
  money: number

  /** The currently equipped Spell Set (battle deck source), or null. */
  equippedSpellSetId: string | null

  stats: {
    dungeonsCompleted: number
    bossesDefeated: number
    totalDamageDealt: number
    totalDamageTaken: number
  }

  createdAt: string
}
