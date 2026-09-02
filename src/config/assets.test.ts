import { describe, it, expect } from 'vitest'
import { assetKeys, getAsset, hasAsset, resolveKey } from './assets'

describe('asset registry', () => {
  it('discovers art from the folder rather than a hand-written list', () => {
    // totem_silverKnight.png was added to the folder but never registered,
    // so it was invisible to the game. Auto-discovery is what fixes that.
    expect(assetKeys('totems')).toContain('totem_silverKnight')
    expect(hasAsset('totems', 'totem_silverKnight')).toBe(true)
  })

  it('falls back to the placeholder for an unknown key', () => {
    expect(getAsset('totems', 'no_such_totem')).toBe(getAsset('totems', 'default'))
  })

  it('matches keys ignoring case and separators', () => {
    // Art arrives named by hand; a capital letter should not lose an image.
    const canonical = getAsset('totems', 'totem_silverKnight')
    expect(getAsset('totems', 'totem_silverknight')).toBe(canonical)
    expect(getAsset('totems', 'TOTEM-SILVERKNIGHT')).toBe(canonical)
    expect(hasAsset('totems', 'totem silver knight')).toBe(true)
  })

  it('resolveKey takes the first candidate that exists', () => {
    expect(resolveKey('scenes', ['dkp_nope', 'dkp_restRoom'])).toBe('dkp_restRoom')
    expect(resolveKey('scenes', ['dkp_nope', 'dkp_alsoNope'])).toBeNull()
  })

  it('does not invent matches for a genuinely different word', () => {
    // Normalization covers case and separators only. "corridor" vs
    // "coridoor" differ by letters, so it correctly finds nothing — that
    // variant is handled by listing both spellings in scenes.ts, not by
    // fuzzy matching, which would risk silently loading the wrong art.
    expect(resolveKey('scenes', ['dkp_corridor1'])).toBeNull()
  })
})
