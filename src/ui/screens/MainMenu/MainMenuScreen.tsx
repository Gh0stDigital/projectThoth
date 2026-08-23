import { useUiStore } from '@/state/uiStore'
import { usePersistentStore } from '@/state/persistentStore'

const menuItems = [
  { screen: 'compendium' as const, icon: '📖', label: 'Load Spells / Compendium', desc: 'Create, edit, and organize Spell Words and Spell Sets.' },
  { screen: 'totem' as const, icon: '🗿', label: 'Totem', desc: 'View your Totem and equip a Spell Set for battle.' },
  { screen: 'dungeon' as const, icon: '🗝️', label: 'Dungeon', desc: 'Configure a dungeon and start exploring.' },
  { screen: 'records' as const, icon: '📊', label: 'Records', desc: 'Review every Spell Word and its study statistics.' },
]

export function MainMenuScreen() {
  const goTo = useUiStore((s) => s.goTo)
  const totem = usePersistentStore((s) => s.totems.find((t) => t.id === s.activeTotemId))
  const spellCount = usePersistentStore((s) => s.spells.length)

  return (
    <div className="screen">
      <div className="menu-title">
        <span className="glyph">🔮</span>
        <h1>Thoth</h1>
        <p className="muted">A language-study dungeon crawler</p>
      </div>

      {totem && (
        <div className="card row">
          <div>
            <div style={{ fontWeight: 700 }}>{totem.name}</div>
            <div className="faint">Lv {totem.level} · {spellCount} Spells known</div>
          </div>
          <div className="faint">💰 {totem.money}</div>
        </div>
      )}

      <div className="menu-list">
        {menuItems.map((item) => (
          <button key={item.screen} className="menu-item" onClick={() => goTo(item.screen)}>
            <span className="icon">{item.icon}</span>
            <div>
              <div className="label">{item.label}</div>
              <div className="desc">{item.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />
      <p className="faint" style={{ textAlign: 'center' }}>
        Fully offline · progress saved on this device
      </p>
    </div>
  )
}
