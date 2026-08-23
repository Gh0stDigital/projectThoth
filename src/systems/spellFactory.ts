import type { Spell } from '@/domain/spell'
import { spellBalance } from '@/config/balance'
import { makeId } from './idGen'

export interface NewSpellInput {
  korean: string
  english: string
  notes?: string
  altKorean?: string[]
  altEnglish?: string[]
}

export interface SpellValidationError {
  field: 'korean' | 'english'
  message: string
}

/** Basic empty-field validation. No semantic/dictionary validation in the prototype. */
export function validateNewSpell(input: NewSpellInput): SpellValidationError[] {
  const errors: SpellValidationError[] = []
  if (!input.korean.trim()) errors.push({ field: 'korean', message: 'Korean word is required.' })
  if (!input.english.trim()) errors.push({ field: 'english', message: 'English meaning is required.' })
  return errors
}

export function createSpell(input: NewSpellInput): Spell {
  const now = new Date().toISOString()
  const level = 1
  return {
    id: makeId('spell'),
    korean: input.korean.trim(),
    english: input.english.trim(),
    notes: input.notes?.trim() ?? '',
    altKorean: (input.altKorean ?? []).map((s) => s.trim()).filter(Boolean),
    altEnglish: (input.altEnglish ?? []).map((s) => s.trim()).filter(Boolean),
    level,
    experience: 0,
    charge: 0,
    maxCharge: spellBalance.maxCharge(level),
    timesEncountered: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    correctAttacks: 0,
    failedAttacks: 0,
    successfulDefenses: 0,
    failedDefenses: 0,
    timesEquipped: 0,
    createdAt: now,
    lastPracticedAt: null,
  }
}
