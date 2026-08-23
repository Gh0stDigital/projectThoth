import { useState } from 'react'
import { usePersistentStore } from '@/state/persistentStore'
import { Bar } from '@/ui/components/Bar'
import { AssetImage } from '@/ui/components/AssetImage'
import { pickFlavor } from '@/config/assets'
import { SpellEditorForm } from './SpellEditorForm'
import type { Spell } from '@/domain/spell'

export function SpellListTab() {
  const spells = usePersistentStore((s) => s.spells)
  const deleteSpell = usePersistentStore((s) => s.deleteSpell)
  const [editing, setEditing] = useState<'new' | Spell | null>(null)
  const [query, setQuery] = useState('')

  if (editing) {
    return (
      <SpellEditorForm
        existing={editing === 'new' ? undefined : editing}
        onDone={() => setEditing(null)}
        onCancel={() => setEditing(null)}
      />
    )
  }

  const filtered = spells.filter(
    (s) => !query || s.korean.includes(query) || s.english.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="list">
      <button className="btn btn-primary btn-block" onClick={() => setEditing('new')}>
        + New Spell Word
      </button>

      {spells.length > 0 && (
        <input
          type="text"
          placeholder="Search your Spells..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {filtered.length === 0 && (
        <div className="empty-state">
          <span className="glyph">📖</span>
          <p>{spells.length === 0 ? 'No Spells yet — create your first one!' : 'No matches.'}</p>
        </div>
      )}

      {filtered.map((spell) => {
        const artKey = pickFlavor('spells', spell.id).split('/').pop()!.replace('.png', '')
        return (
          <div key={spell.id} className="spell-card-list-item">
            <div className="thumb">
              <AssetImage category="spells" assetKey={artKey} alt={spell.korean} />
            </div>
            <div className="info" onClick={() => setEditing(spell)}>
              <div className="kor">{spell.korean}</div>
              <div className="eng">{spell.english}</div>
              <div className="row" style={{ marginTop: 4 }}>
                <span className="faint">Lv {spell.level}</span>
                <div style={{ flex: 1 }}>
                  <Bar value={spell.charge} max={spell.maxCharge} kind="charge" thin />
                </div>
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (confirm(`Delete "${spell.korean}"? This cannot be undone.`)) deleteSpell(spell.id)
              }}
            >
              🗑️
            </button>
          </div>
        )
      })}
    </div>
  )
}
