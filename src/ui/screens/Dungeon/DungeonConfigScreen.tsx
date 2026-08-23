import { useState } from 'react'
import { useUiStore } from '@/state/uiStore'
import { usePersistentStore } from '@/state/persistentStore'
import { useDungeonStore } from '@/state/dungeonStore'
import { TopBar } from '@/ui/components/TopBar'
import { dungeonTiers, type DungeonTierId } from '@/config/balance'
import { buildDungeonConfig } from '@/systems/dungeonSession'

export function DungeonConfigScreen() {
  const goTo = useUiStore((s) => s.goTo)
  const totems = usePersistentStore((s) => s.totems)
  const activeTotemId = usePersistentStore((s) => s.activeTotemId)
  const spellSets = usePersistentStore((s) => s.spellSets)
  const lastSelection = usePersistentStore((s) => s.lastDungeonSelection)
  const setLastSelection = usePersistentStore((s) => s.setLastDungeonSelection)
  const beginDungeon = useDungeonStore((s) => s.beginDungeon)

  const totem = totems.find((t) => t.id === activeTotemId) ?? totems[0]

  const [totemSetId, setTotemSetId] = useState<string | null>(totem?.equippedSpellSetId ?? lastSelection.totemSpellSetId)
  const [dungeonSetId, setDungeonSetId] = useState<string | null>(lastSelection.dungeonSpellSetId ?? totemSetId)
  const [tierId, setTierId] = useState<DungeonTierId>(lastSelection.tierId)

  const totemSet = spellSets.find((s) => s.id === totemSetId) ?? null
  const dungeonSet = spellSets.find((s) => s.id === dungeonSetId) ?? null
  const tier = dungeonTiers.find((t) => t.id === tierId)!

  const canStart = !!totem && !!totemSet && totemSet.spellIds.length > 0 && !!dungeonSet && dungeonSet.spellIds.length > 0

  function handleStart() {
    if (!totem || !totemSet || !dungeonSet) return
    setLastSelection({ totemSpellSetId: totemSet.id, dungeonSpellSetId: dungeonSet.id, tierId })
    const config = buildDungeonConfig(totem.id, totemSet.id, dungeonSet.id, dungeonSet.spellIds, tier)
    beginDungeon(config)
  }

  return (
    <div className="screen screen-scroll">
      <TopBar title="Dungeon" onBack={() => goTo('menu')} />

      {!totem && <p className="muted">Create a Totem first.</p>}

      {spellSets.length === 0 && (
        <div className="empty-state">
          <span className="glyph">🗝️</span>
          <p>You need at least one Spell Set to enter a dungeon. Create one from the Compendium.</p>
        </div>
      )}

      {totem && spellSets.length > 0 && (
        <>
          <div className="field">
            <label>Active Totem</label>
            <div className="card">{totem.name} (Lv {totem.level})</div>
          </div>

          <div className="field">
            <label htmlFor="totem-set-select">Totem Spell Set (attack deck)</label>
            <select id="totem-set-select" value={totemSetId ?? ''} onChange={(e) => setTotemSetId(e.target.value || null)}>
              <option value="">— choose a set —</option>
              {spellSets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.spellIds.length})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="dungeon-set-select">Dungeon Spell Set (word pool)</label>
            <select id="dungeon-set-select" value={dungeonSetId ?? ''} onChange={(e) => setDungeonSetId(e.target.value || null)}>
              <option value="">— choose a set —</option>
              {spellSets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.spellIds.length})
                </option>
              ))}
            </select>
            <p className="faint">May be the same set as your Totem Spell Set, or different for mixed practice.</p>
          </div>

          <div className="field">
            <label>Dungeon Tier</label>
            <div className="btn-row">
              {dungeonTiers.map((t) => (
                <button
                  key={t.id}
                  className={`btn btn-sm ${tierId === t.id ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setTierId(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {dungeonSet && (
              <p className="faint">
                Pool: {Math.min(dungeonSet.spellIds.length, tier.wordLimit)} of {dungeonSet.spellIds.length} words in this set will be used.
              </p>
            )}
          </div>

          <button className="btn btn-primary btn-block" disabled={!canStart} onClick={handleStart}>
            Enter Dungeon
          </button>
          {!canStart && <p className="faint">Choose a non-empty Spell Set for both roles to continue.</p>}
        </>
      )}
    </div>
  )
}
