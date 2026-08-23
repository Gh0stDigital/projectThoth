import { create } from 'zustand'
import type { Spell } from '@/domain/spell'
import type { SpellSet } from '@/domain/spellSet'
import type { Totem } from '@/domain/totem'
import type { GameSettings } from '@/domain/settings'
import { defaultSettings } from '@/domain/settings'
import type { DungeonTierId } from '@/config/balance'
import { PersistenceService, localStorageAdapter } from '@/systems/persistence'
import { addSpell, editSpell, deleteSpell, type SpellEditInput, markEquipped } from '@/systems/spellCompendium'
import type { NewSpellInput } from '@/systems/spellFactory'
import {
  createSpellSet,
  renameSpellSet,
  addSpellToSet,
  removeSpellFromSet,
  deleteSpellSet,
  pruneSpellFromAllSets,
} from '@/systems/spellSetManager'
import { createTotem, equipSpellSet } from '@/systems/totemManager'

export interface DungeonSelectionDraft {
  totemSpellSetId: string | null
  dungeonSpellSetId: string | null
  tierId: DungeonTierId
}

export interface PersistedData {
  spells: Spell[]
  spellSets: SpellSet[]
  totems: Totem[]
  activeTotemId: string | null
  settings: GameSettings
  lastDungeonSelection: DungeonSelectionDraft
}

const persistence = new PersistenceService<PersistedData>(localStorageAdapter)

function defaultData(): PersistedData {
  const totem = createTotem('Totem')
  return {
    spells: [],
    spellSets: [],
    totems: [totem],
    activeTotemId: totem.id,
    settings: defaultSettings,
    lastDungeonSelection: { totemSpellSetId: null, dungeonSpellSetId: null, tierId: 'tier10' },
  }
}

function loadInitial(): PersistedData {
  const saved = persistence.load()
  if (!saved) return defaultData()
  // Shallow-merge with defaults so new fields introduced later don't break old saves.
  const defaults = defaultData()
  return {
    spells: saved.spells ?? defaults.spells,
    spellSets: saved.spellSets ?? defaults.spellSets,
    totems: saved.totems && saved.totems.length > 0 ? saved.totems : defaults.totems,
    activeTotemId: saved.activeTotemId ?? defaults.activeTotemId,
    settings: { ...defaults.settings, ...saved.settings },
    lastDungeonSelection: { ...defaults.lastDungeonSelection, ...saved.lastDungeonSelection },
  }
}

export interface PersistentStore extends PersistedData {
  createSpell(input: NewSpellInput): Spell
  editSpell(id: string, patch: SpellEditInput): void
  deleteSpell(id: string): void
  replaceSpells(updater: (spells: Spell[]) => Spell[]): void

  createSpellSet(name: string, spellIds?: string[]): SpellSet
  renameSpellSet(id: string, name: string): void
  addSpellToSet(setId: string, spellId: string): void
  removeSpellFromSet(setId: string, spellId: string): void
  deleteSpellSet(id: string): void

  createTotem(name: string): Totem
  setActiveTotem(id: string): void
  equipTotemSpellSet(totemId: string, spellSetId: string | null): void
  replaceTotem(id: string, updater: (t: Totem) => Totem): void

  updateSettings(patch: Partial<GameSettings>): void
  setLastDungeonSelection(sel: DungeonSelectionDraft): void
}

export const usePersistentStore = create<PersistentStore>()((set, get) => ({
  ...loadInitial(),

  createSpell(input) {
    let created: Spell | undefined
    set((state) => {
      const spells = addSpell(state.spells, input)
      created = spells[spells.length - 1]
      return { spells }
    })
    return created!
  },
  editSpell(id, patch) {
    set((state) => ({ spells: editSpell(state.spells, id, patch) }))
  },
  deleteSpell(id) {
    set((state) => ({
      spells: deleteSpell(state.spells, id),
      spellSets: pruneSpellFromAllSets(state.spellSets, id),
    }))
  },
  replaceSpells(updater) {
    set((state) => ({ spells: updater(state.spells) }))
  },

  createSpellSet(name, spellIds = []) {
    let created: SpellSet | undefined
    set((state) => {
      const sets = createSpellSet(state.spellSets, name, spellIds)
      created = sets[sets.length - 1]
      return { spellSets: sets }
    })
    return created!
  },
  renameSpellSet(id, name) {
    set((state) => ({ spellSets: renameSpellSet(state.spellSets, id, name) }))
  },
  addSpellToSet(setId, spellId) {
    set((state) => ({ spellSets: addSpellToSet(state.spellSets, setId, spellId) }))
  },
  removeSpellFromSet(setId, spellId) {
    set((state) => ({ spellSets: removeSpellFromSet(state.spellSets, setId, spellId) }))
  },
  deleteSpellSet(id) {
    set((state) => ({
      spellSets: deleteSpellSet(state.spellSets, id),
      totems: state.totems.map((t) => (t.equippedSpellSetId === id ? { ...t, equippedSpellSetId: null } : t)),
    }))
  },

  createTotem(name) {
    const totem = createTotem(name)
    set((state) => ({ totems: [...state.totems, totem] }))
    return totem
  },
  setActiveTotem(id) {
    set({ activeTotemId: id })
  },
  equipTotemSpellSet(totemId, spellSetId) {
    set((state) => ({
      totems: state.totems.map((t) => (t.id === totemId ? equipSpellSet(t, spellSetId) : t)),
      spells: spellSetId ? markEquipped(state.spells, get().spellSets.find((s) => s.id === spellSetId)?.spellIds ?? []) : state.spells,
    }))
  },
  replaceTotem(id, updater) {
    set((state) => ({ totems: state.totems.map((t) => (t.id === id ? updater(t) : t)) }))
  },

  updateSettings(patch) {
    set((state) => ({ settings: { ...state.settings, ...patch } }))
  },
  setLastDungeonSelection(sel) {
    set({ lastDungeonSelection: sel })
  },
}))

// Persist on every change. Simple + adequate for prototype scale.
usePersistentStore.subscribe((state) => {
  const { spells, spellSets, totems, activeTotemId, settings, lastDungeonSelection } = state
  persistence.save({ spells, spellSets, totems, activeTotemId, settings, lastDungeonSelection })
})
