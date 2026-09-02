/**
 * Local asset configuration.
 *
 * All game art is bundled as local PNG files under /public/assets — nothing
 * is ever fetched from the network. Every lookup here falls back to a
 * neutral placeholder so the game stays fully playable before final art
 * exists. Swap the PNG files (or add new keys) to reskin the game; no other
 * system needs to change.
 */

export type AssetCategory =
  | 'locations'
  | 'events'
  | 'traps'
  | 'treasure'
  | 'totems'
  | 'enemies'
  | 'bosses'
  | 'battlebg'
  | 'spells'

const BASE = 'assets'

function assetUrl(category: AssetCategory, file: string): string {
  // Vite serves /public at the app root; base: './' in vite.config.ts keeps
  // this working when the built app is opened directly from disk.
  return `${BASE}/${category}/${file}.png`
}

const registry: Record<AssetCategory, Record<string, string>> = {
  locations: {
    default: assetUrl('locations', 'default'),
    forest: assetUrl('locations', 'forest'),
    cave: assetUrl('locations', 'cave'),
    ruins: assetUrl('locations', 'ruins'),
  },
  events: {
    default: assetUrl('events', 'default'),
    empty: assetUrl('events', 'empty'),
    branch: assetUrl('events', 'branch'),
    discovery: assetUrl('events', 'discovery'),
    special: assetUrl('events', 'special'),
    bossroom: assetUrl('events', 'bossroom'),
  },
  traps: {
    default: assetUrl('traps', 'default'),
    sprung: assetUrl('traps', 'sprung'),
  },
  treasure: {
    default: assetUrl('treasure', 'default'),
    locked: assetUrl('treasure', 'locked'),
    open: assetUrl('treasure', 'open'),
    shrine: assetUrl('treasure', 'shrine'),
    rest: assetUrl('treasure', 'rest'),
  },
  totems: {
    default: assetUrl('totems', 'default'),
    totem_ember: assetUrl('totems', 'totem_ember'),
    totem_tide: assetUrl('totems', 'totem_tide'),
    totem_stone: assetUrl('totems', 'totem_stone'),
  },
  enemies: {
    default: assetUrl('enemies', 'default'),
    slime: assetUrl('enemies', 'slime'),
    goblin: assetUrl('enemies', 'goblin'),
    wraith: assetUrl('enemies', 'wraith'),
  },
  bosses: {
    default: assetUrl('bosses', 'default'),
    guardian: assetUrl('bosses', 'guardian'),
  },
  battlebg: {
    default: assetUrl('battlebg', 'default'),
    cave: assetUrl('battlebg', 'cave'),
    ruins: assetUrl('battlebg', 'ruins'),
    boss: assetUrl('battlebg', 'boss'),
  },
  spells: {
    default: assetUrl('spells', 'default'),
    fire: assetUrl('spells', 'fire'),
    water: assetUrl('spells', 'water'),
    earth: assetUrl('spells', 'earth'),
    wind: assetUrl('spells', 'wind'),
    arcane: assetUrl('spells', 'arcane'),
  },
}

/**
 * Resolve an asset path for a category + key, falling back to that
 * category's "default" placeholder when the key is missing or blank.
 */
export function getAsset(category: AssetCategory, key?: string | null): string {
  const table = registry[category]
  if (key && table[key]) return table[key]
  return table.default
}

/** Deterministically pick a "random" flavor asset for a category from an id string. */
export function pickFlavor(category: AssetCategory, seed: string): string {
  const table = registry[category]
  const keys = Object.keys(table).filter((k) => k !== 'default')
  if (keys.length === 0) return table.default
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return table[keys[hash % keys.length]]
}

export const assetRegistry = registry

/**
 * Every key a category offers, in registry order. This is the list the UI
 * picks from, so anything added to the registry (and dropped into
 * public/assets/<category>/) becomes selectable with no other change.
 */
export function assetKeys(category: AssetCategory): string[] {
  return Object.keys(registry[category])
}

/** True when a key names real art rather than falling back to the placeholder. */
export function hasAsset(category: AssetCategory, key: string): boolean {
  return key in registry[category]
}
