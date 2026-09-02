import { useState } from 'react'
import { useUiStore } from '@/state/uiStore'
import { usePersistentStore } from '@/state/persistentStore'
import { TopBar } from '@/ui/components/TopBar'
import { AssetImage } from '@/ui/components/AssetImage'
import { Bar } from '@/ui/components/Bar'
import { SlidePanel } from '@/ui/components/SlidePanel'
import { totemBalance } from '@/config/balance'
import { assetKeys } from '@/config/assets'
import { isUsable } from '@/systems/totemManager'

export function TotemScreen() {
  const goTo = useUiStore((s) => s.goTo)
  const totems = usePersistentStore((s) => s.totems)
  const activeTotemId = usePersistentStore((s) => s.activeTotemId)
  const spellSets = usePersistentStore((s) => s.spellSets)
  const equipTotemSpellSet = usePersistentStore((s) => s.equipTotemSpellSet)
  const editName = usePersistentStore((s) => s.replaceTotem)
  const createNewTotem = usePersistentStore((s) => s.createTotem)
  const setTotemAvatar = usePersistentStore((s) => s.setTotemAvatar)
  const setActiveTotem = usePersistentStore((s) => s.setActiveTotem)

  // Prefer a Totem that can still be played; a destroyed one is only shown
  // as a memorial when nothing usable is left.
  const totem = totems.find((t) => t.id === activeTotemId) ?? totems.find(isUsable) ?? totems[0]
  const usable = totems.filter(isUsable)
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(totem?.name ?? '')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)

  if (!totem) {
    return (
      <div className="screen">
        <TopBar title="Totem" onBack={() => goTo('menu')} />
        <p className="muted">No Totem found.</p>
      </div>
    )
  }

  const equippedSet = spellSets.find((s) => s.id === totem.equippedSpellSetId) ?? null
  const xpNeeded = totemBalance.xpToNextLevel(totem.level)

  return (
    <div className="screen">
      <TopBar title="Totem" onBack={() => goTo('menu')} />

      <div className="panel" style={{ textAlign: 'center' }}>
        <button
          className="totem-hero-frame"
          onClick={() => setAvatarPickerOpen(true)}
          title="Change portrait"
        >
          <AssetImage category="totems" assetKey={totem.avatarKey} alt={totem.name} className="avatar-img avatar-hero" />
        </button>
        {/* Below the frame, not over the art. */}
        <button className="totem-hero-edit" onClick={() => setAvatarPickerOpen(true)}>
          Change portrait
        </button>

        {renaming ? (
          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <input type="text" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} style={{ maxWidth: 180 }} />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                editName(totem.id, (t) => ({ ...t, name: nameDraft.trim() || t.name }))
                setRenaming(false)
              }}
            >
              Save
            </button>
          </div>
        ) : (
          <h2 onClick={() => setRenaming(true)} style={{ cursor: 'pointer' }}>
            {totem.name} ✏️
          </h2>
        )}

        <p className="muted">Level {totem.level}</p>

        <div className="life-points" title="Life Points">
          {Array.from({ length: totem.maxLifePoints }, (_, i) => (
            <span key={i} className={`life-pip${i < totem.lifePoints ? ' lit' : ''}`}>
              {i < totem.lifePoints ? '◆' : '◇'}
            </span>
          ))}
          <span className="faint">
            {totem.lifePoints}/{totem.maxLifePoints} Life Points
          </span>
        </div>

        {totem.destroyed && (
          <div className="feedback-banner incorrect">
            💀 This Totem has been destroyed and can no longer enter a dungeon.
          </div>
        )}

        <div style={{ margin: '6px 0' }}>
          <Bar value={totem.experience} max={xpNeeded} kind="xp" />
          <p className="faint">{totem.experience}/{xpNeeded} XP to next level</p>
        </div>

        <div className="row" style={{ marginTop: 10 }}>
          <div>
            <div className="faint">HP</div>
            <b>{totem.currentHp}/{totem.maxHp}</b>
          </div>
          <div>
            <div className="faint">Money</div>
            <b>💰 {totem.money}</b>
          </div>
          <div>
            <div className="faint">Bosses Beaten</div>
            <b>{totem.stats.bossesDefeated}</b>
          </div>
        </div>
      </div>

      <div className="field">
        <label>Battle Deck (Equipped Spell Set)</label>
        <button className="card row" style={{ width: '100%', textAlign: 'left' }} onClick={() => setPickerOpen(true)}>
          <div>
            <div style={{ fontWeight: 700 }}>{equippedSet ? equippedSet.name : 'None equipped'}</div>
            <div className="faint">{equippedSet ? `${equippedSet.spellIds.length} Spells` : 'Tap to choose a Spell Set'}</div>
          </div>
          <span className="faint">Change</span>
        </button>
      </div>

      {totems.length > 1 && (
        <div className="field">
          <label>Your Totems</label>
          <div className="list">
            {totems.map((t) => (
              <button
                key={t.id}
                className="card row"
                disabled={!isUsable(t)}
                style={{ width: '100%', textAlign: 'left', opacity: isUsable(t) ? 1 : 0.5 }}
                onClick={() => setActiveTotem(t.id)}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div className="faint">
                    Lv {t.level} · {t.destroyed ? 'destroyed' : `◆ ${t.lifePoints}/${t.maxLifePoints}`}
                  </div>
                </div>
                {t.id === totem.id ? <span style={{ color: 'var(--accent-gold)' }}>✓ Active</span> : null}
              </button>
            ))}
          </div>
        </div>
      )}

      {usable.length === 0 && (
        <button className="btn btn-primary btn-block" onClick={() => createNewTotem('Totem')}>
          🗿 Raise a New Totem
        </button>
      )}

      <div style={{ flex: 1 }} />

      {avatarPickerOpen && (
        <SlidePanel title="Choose Portrait" onClose={() => setAvatarPickerOpen(false)}>
          <p className="faint">
            Every portrait in <code>public/assets/totems</code>. Purely cosmetic — nothing else about the Totem
            changes.
          </p>
          <div className="avatar-grid">
            {assetKeys('totems').map((key) => (
              <button
                key={key}
                className={`avatar-option${key === totem.avatarKey ? ' selected' : ''}`}
                onClick={() => {
                  setTotemAvatar(totem.id, key)
                  setAvatarPickerOpen(false)
                }}
              >
                <AssetImage category="totems" assetKey={key} alt={key} className="avatar-img" />
                <span className="avatar-option-name">{key}</span>
              </button>
            ))}
          </div>
        </SlidePanel>
      )}

      {pickerOpen && (
        <SlidePanel title="Choose Spell Set" onClose={() => setPickerOpen(false)}>
          {spellSets.length === 0 && (
            <div className="empty-state">
              <span className="glyph">🗂️</span>
              <p>No Spell Sets yet — create one from the Compendium first.</p>
            </div>
          )}

          <div className="list">
            {spellSets.map((set) => (
              <button
                key={set.id}
                className="card row"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  borderColor: set.id === totem.equippedSpellSetId ? 'var(--accent-gold)' : undefined,
                }}
                onClick={() => {
                  equipTotemSpellSet(totem.id, set.id)
                  setPickerOpen(false)
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{set.name}</div>
                  <div className="faint">{set.spellIds.length} Spells</div>
                </div>
                {set.id === totem.equippedSpellSetId ? (
                  <span style={{ color: 'var(--accent-gold)' }}>✓ Equipped</span>
                ) : (
                  <span className="faint">Equip</span>
                )}
              </button>
            ))}
          </div>

          {equippedSet && (
            <button
              className="btn btn-ghost btn-block"
              onClick={() => {
                equipTotemSpellSet(totem.id, null)
                setPickerOpen(false)
              }}
            >
              Unequip Spell Set
            </button>
          )}
        </SlidePanel>
      )}
    </div>
  )
}
