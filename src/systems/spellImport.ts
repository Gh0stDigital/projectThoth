/**
 * Batch Spell Word import — pure text parsing, no React/state.
 *
 * Accepts loosely-formatted text (pasted from Notes, a spreadsheet export,
 * or a plain .txt/.csv file) and turns it into a per-line report the UI can
 * preview before committing anything. One Spell per line:
 *
 *   korean, english
 *   korean, english, notes
 *
 * The delimiter is auto-detected per line (tab, pipe, " - ", or comma) so a
 * straight paste from a spreadsheet (tab-separated) works exactly the same
 * as a hand-typed comma list. A leading header row ("korean,english" /
 * "word,meaning" / ...) is recognized and skipped automatically, blank
 * lines are ignored, and lines starting with # are treated as comments.
 */

import type { Spell } from '@/domain/spell'
import { validateNewSpell, type NewSpellInput } from './spellFactory'

export type ImportRowStatus = 'ok' | 'error' | 'duplicate'

export interface ImportRow {
  line: number
  raw: string
  korean: string
  english: string
  notes: string
  status: ImportRowStatus
  message?: string
}

export interface ImportResult {
  rows: ImportRow[]
  ok: ImportRow[]
  errors: ImportRow[]
  duplicates: ImportRow[]
}

// Tried in order; the first delimiter that splits a line into 2+ fields wins.
// Tab first since that's what pasting a spreadsheet selection produces.
const DELIMITERS: (string | RegExp)[] = ['\t', '|', /\s+-\s+/, ',']

const HEADER_TOKENS = new Set(['korean', 'english', 'word', 'meaning', 'notes', 'kor', 'eng', 'term', 'definition'])

function splitFields(line: string): string[] {
  for (const delimiter of DELIMITERS) {
    const parts = line.split(delimiter)
    if (parts.length >= 2) return parts.map((p) => p.trim())
  }
  return [line.trim()]
}

function looksLikeHeader(fields: string[]): boolean {
  if (fields.length < 2) return false
  return HEADER_TOKENS.has(fields[0].toLowerCase()) && HEADER_TOKENS.has(fields[1].toLowerCase())
}

/**
 * Parses raw import text into a row-by-row report. `existingSpells` is used
 * only to flag duplicates (by exact Korean word match, case-insensitive) —
 * nothing is created here, this is preview-only.
 */
export function parseImportText(text: string, existingSpells: Spell[]): ImportResult {
  const existingKorean = new Set(existingSpells.map((s) => s.korean.trim().toLowerCase()))
  const seenInBatch = new Set<string>()
  const rows: ImportRow[] = []

  const lines = text.split(/\r?\n/)
  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim()
    const lineNumber = idx + 1
    if (!line || line.startsWith('#')) return

    const fields = splitFields(line)
    if (lineNumber === 1 && looksLikeHeader(fields)) return

    const korean = fields[0] ?? ''
    const english = fields[1] ?? ''
    const notes = fields[2] ?? ''
    const validation = validateNewSpell({ korean, english })

    if (validation.length > 0) {
      const missing = validation.map((e) => e.field).join(' and ')
      rows.push({
        line: lineNumber,
        raw: line,
        korean,
        english,
        notes,
        status: 'error',
        message: fields.length < 2 ? 'Could not find two columns — check the delimiter.' : `Missing ${missing}.`,
      })
      return
    }

    const key = korean.toLowerCase()
    if (existingKorean.has(key) || seenInBatch.has(key)) {
      rows.push({
        line: lineNumber,
        raw: line,
        korean,
        english,
        notes,
        status: 'duplicate',
        message: 'Already in your Compendium — will be skipped.',
      })
      return
    }

    seenInBatch.add(key)
    rows.push({ line: lineNumber, raw: line, korean, english, notes, status: 'ok' })
  })

  return {
    rows,
    ok: rows.filter((r) => r.status === 'ok'),
    errors: rows.filter((r) => r.status === 'error'),
    duplicates: rows.filter((r) => r.status === 'duplicate'),
  }
}

export function importRowsToInputs(rows: ImportRow[]): NewSpellInput[] {
  return rows.map((r) => ({ korean: r.korean, english: r.english, notes: r.notes || undefined }))
}
