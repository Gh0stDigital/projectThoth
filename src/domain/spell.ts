/**
 * Spell / word domain model.
 *
 * A Spell is a single vocabulary entry. It carries both the study content
 * (Korean/English/notes) and its long-term progression + statistics. This
 * file only defines the shape of the data — see systems/spellProgression.ts
 * and systems/spellCompendium.ts for the logic that mutates it.
 */

export interface Spell {
  id: string
  korean: string
  english: string
  notes: string

  /** Optional alternative acceptable answers, entered explicitly by the player. */
  altKorean: string[]
  altEnglish: string[]

  level: number
  experience: number
  charge: number
  maxCharge: number

  timesEncountered: number
  correctAnswers: number
  incorrectAnswers: number

  correctAttacks: number
  failedAttacks: number
  successfulDefenses: number
  failedDefenses: number

  timesEquipped: number

  createdAt: string
  lastPracticedAt: string | null
}

export function spellAccuracy(spell: Spell): number {
  const total = spell.correctAnswers + spell.incorrectAnswers
  if (total === 0) return 0
  return spell.correctAnswers / total
}
