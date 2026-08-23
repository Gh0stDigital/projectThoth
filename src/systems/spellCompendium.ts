import type { Spell } from '@/domain/spell'
import { spellBalance } from '@/config/balance'
import { createSpell, type NewSpellInput } from './spellFactory'
import { addExperience, applyChargeDelta, type LevelUpResult } from './spellProgression'

/**
 * Spell Compendium — pure reducer-style operations over an array of Spells.
 * These are the only functions allowed to mutate Spell records; UI and
 * state stores call into them rather than editing Spells directly.
 */

export function addSpell(spells: Spell[], input: NewSpellInput): Spell[] {
  return [...spells, createSpell(input)]
}

export interface SpellEditInput {
  korean?: string
  english?: string
  notes?: string
  altKorean?: string[]
  altEnglish?: string[]
}

/** Edits only the player-authored content fields — never progression stats. */
export function editSpell(spells: Spell[], id: string, patch: SpellEditInput): Spell[] {
  return spells.map((s) => {
    if (s.id !== id) return s
    return {
      ...s,
      korean: patch.korean !== undefined ? patch.korean.trim() : s.korean,
      english: patch.english !== undefined ? patch.english.trim() : s.english,
      notes: patch.notes !== undefined ? patch.notes.trim() : s.notes,
      altKorean: patch.altKorean !== undefined ? patch.altKorean.map((x) => x.trim()).filter(Boolean) : s.altKorean,
      altEnglish: patch.altEnglish !== undefined ? patch.altEnglish.map((x) => x.trim()).filter(Boolean) : s.altEnglish,
    }
  })
}

export function deleteSpell(spells: Spell[], id: string): Spell[] {
  return spells.filter((s) => s.id !== id)
}

export function getSpell(spells: Spell[], id: string): Spell | undefined {
  return spells.find((s) => s.id === id)
}

export function acceptableAnswers(spell: Spell, kind: 'korean' | 'english'): string[] {
  return kind === 'korean' ? [spell.korean, ...spell.altKorean] : [spell.english, ...spell.altEnglish]
}

export type ChallengeContext = 'challenge' | 'attack' | 'defense'

export interface ChallengeOutcomeResult {
  spell: Spell
  leveledUp: LevelUpResult
  xpGained: number
}

/**
 * Applies the result of any vocabulary challenge (general event, battle
 * attack, or battle defense) to a Spell: updates encounter/accuracy stats,
 * adjusts charge, and — on a correct answer — grants experience.
 */
export function recordChallengeOutcome(
  spell: Spell,
  correct: boolean,
  context: ChallengeContext,
): ChallengeOutcomeResult {
  let s: Spell = {
    ...spell,
    timesEncountered: spell.timesEncountered + 1,
    correctAnswers: spell.correctAnswers + (correct ? 1 : 0),
    incorrectAnswers: spell.incorrectAnswers + (correct ? 0 : 1),
    lastPracticedAt: new Date().toISOString(),
  }

  if (context === 'attack') {
    s = { ...s, correctAttacks: s.correctAttacks + (correct ? 1 : 0), failedAttacks: s.failedAttacks + (correct ? 0 : 1) }
  } else if (context === 'defense') {
    s = {
      ...s,
      successfulDefenses: s.successfulDefenses + (correct ? 1 : 0),
      failedDefenses: s.failedDefenses + (correct ? 0 : 1),
    }
  }

  s = applyChargeDelta(s, correct ? spellBalance.chargeGainOnCorrect : -spellBalance.chargeLossOnIncorrect)

  let xpGained = 0
  let leveledUp: LevelUpResult = { spell: s, leveledUp: false, fromLevel: s.level, toLevel: s.level }
  if (correct) {
    xpGained =
      context === 'attack'
        ? spellBalance.xpPerCorrectAttack
        : context === 'defense'
          ? spellBalance.xpPerCorrectDefense
          : spellBalance.xpPerCorrectChallenge
    leveledUp = addExperience(s, xpGained)
    s = leveledUp.spell
  }

  return { spell: s, leveledUp, xpGained }
}

/** Extra XP awarded when a correct answer also clears a Boss Plateau requirement. */
export function grantPlateauBonusXp(spell: Spell): ChallengeOutcomeResult {
  const leveledUp = addExperience(spell, spellBalance.xpPerPlateauClear)
  return { spell: leveledUp.spell, leveledUp, xpGained: spellBalance.xpPerPlateauClear }
}

export function markEquipped(spells: Spell[], spellIds: string[]): Spell[] {
  const idSet = new Set(spellIds)
  return spells.map((s) => (idSet.has(s.id) ? { ...s, timesEquipped: s.timesEquipped + 1 } : s))
}
