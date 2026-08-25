/**
 * Vocabulary answer checking.
 *
 * The prototype never judges semantic correctness — it only compares the
 * player's input against their own saved answer(s), with light
 * normalization. Nothing here silently rewrites saved vocabulary.
 */

export type AnswerKind = 'korean' | 'english'

/** Ignore surrounding whitespace and, for English, capitalization. */
export function normalize(text: string, kind: AnswerKind): string {
  let t = text.trim().replace(/\s+/g, ' ')
  if (kind === 'english') t = t.toLowerCase()
  return t
}

/**
 * Whitespace-insensitive form, used when the answer was assembled from
 * tiles: syllable/letter tiles carry no spaces, so "안녕히 가세요" is built
 * as "안녕히가세요" and must still count as correct.
 */
function collapse(text: string, kind: AnswerKind): string {
  return normalize(text, kind).replace(/\s+/g, '')
}

export function checkAnswer(submitted: string, acceptable: string[], kind: AnswerKind): boolean {
  const normalizedSubmitted = normalize(submitted, kind)
  if (!normalizedSubmitted) return false
  if (acceptable.some((a) => normalize(a, kind) === normalizedSubmitted)) return true
  // Fall back to ignoring spacing entirely — see collapse() above.
  const collapsedSubmitted = collapse(submitted, kind)
  return acceptable.some((a) => collapse(a, kind) === collapsedSubmitted)
}
