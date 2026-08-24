import { useState } from 'react'
import { useUiStore } from '@/state/uiStore'
import { usePersistentStore } from '@/state/persistentStore'
import { useDungeonStore } from '@/state/dungeonStore'
import { TopBar } from '@/ui/components/TopBar'
import { AssetImage } from '@/ui/components/AssetImage'
import { TotemPanel } from '@/ui/components/TotemPanel'
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
          {/* 1. Dungeon name — the flavorful headline for the currently
              selected tier, updates live as the tier picker below changes. */}
          <h2 className="dungeon-name">{tier.name}</h2>

          {/* 2. Dungeon entrance image */}
          <div className="scene-window">
            <AssetImage category="locations" assetKey="default" alt="Dungeon entrance" />
            <span className="scene-tag">{tier.label}</span>
          </div>

          {/* 3. Active Totem — avatar + info, plus which deck it fights with */}
          <TotemPanel totem={totem} />

          <div className="field">
            <label htmlFor="totem-set-select">Battle Deck (Totem Spell Set)</label>
            <select id="totem-set-select" value={totemSetId ?? ''} onChange={(e) => setTotemSetId(e.target.value || null)}>
              <option value="">— choose a set —</option>
              {spellSets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.spellIds.length})
                </option>
              ))}
            </select>
            <p className="faint">The Spell cards your Totem can attack with in battle.</p>
          </div>

          {/* 4. Dungeon tier selection */}
          <div className="field">
            <label>Dungeon Tier</label>
            <div className="tier-card-list">
              {dungeonTiers.map((t) => (
                <button
                  key={t.id}
                  className="tier-card"
                  data-selected={tierId === t.id}
                  onClick={() => setTierId(t.id)}
                >
                  <div className="tier-card-name">{t.name}</div>
                  <div className="tier-card-meta faint">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Dungeon information display */}
          <div className="dungeon-info-panel">
            <p className="dungeon-info-desc">{tier.description}</p>
            <div className="stats-grid">
              <div className="stat-tile">
                <div className="faint">Word Limit</div>
                <div className="value">{tier.wordLimit}</div>
              </div>
              <div className="stat-tile">
                <div className="faint">Boss Unlocks After</div>
                <div className="value">~{tier.minEventsBeforeBossEligible} events</div>
              </div>
              <div className="stat-tile">
                <div className="faint">Enemy Damage</div>
                <div className="value">×{tier.enemyDamageMultiplier}</div>
              </div>
            </div>
          </div>

          {/* 6. Dungeon Tendency — the word pool this run draws from */}
          <div className="field">
            <label htmlFor="dungeon-set-select">Dungeon Tendency (Word Set)</label>
            <select id="dungeon-set-select" value={dungeonSetId ?? ''} onChange={(e) => setDungeonSetId(e.target.value || null)}>
              <option value="">— choose a set —</option>
              {spellSets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.spellIds.length})
                </option>
              ))}
            </select>
            {dungeonSet ? (
              <p className="faint">
                Pool: {Math.min(dungeonSet.spellIds.length, tier.wordLimit)} of {dungeonSet.spellIds.length} words in
                this set will be used. May be the same set as your Battle Deck, or different for mixed practice.
              </p>
            ) : (
              <p className="faint">The words this dungeon leans toward — its events and challenges draw from here.</p>
            )}
          </div>

          {/* 7. Enter dungeon */}
          <button className="btn btn-primary btn-block" disabled={!canStart} onClick={handleStart}>
            Enter Dungeon
          </button>
          {!canStart && <p className="faint">Choose a non-empty Spell Set for both roles to continue.</p>}
        </>
      )}
    </div>
  )
}
