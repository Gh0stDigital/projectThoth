/**
 * Vocabulary answer checking.
 *
 * The prototype never judges semantic correctness — it only compares the
 * player's input against their own saved answer(s), with light
 * normalization. Nothing here silently rewrites saved vocabulary.
 */

/** Ignore surrounding whitespace and, for English, capitalization. */
export function normalize(text: string, kind: 'korean' | 'english'): string {
  let t = text.trim().replace(/\s+/g, ' ')
  if (kind === 'english') t = t.toLowerCase()
  return t
}

export function checkAnswer(
  submitted: string,
  acceptable: string[],
  kind: 'korean' | 'english',
): boolean {
  const normalizedSubmitted = normalize(submitted, kind)
  if (!normalizedSubmitted) return false
  return acceptable.some((a) => normalize(a, kind) === normalizedSubmitted)
}
