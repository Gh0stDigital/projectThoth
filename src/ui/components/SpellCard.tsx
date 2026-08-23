import type { Spell } from '@/domain/spell'
import { damageForSpell } from '@/systems/spellProgression'
import { pickFlavor } from '@/config/assets'
import { AssetImage } from './AssetImage'
import { Bar } from './Bar'

interface SpellCardProps {
  spell: Spell
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
}

/** A single battle-hand Spell card: word, level, charge, potential damage. */
export function SpellCard({ spell, selected, disabled, onClick }: SpellCardProps) {
  const artKey = pickFlavor('spells', spell.id).split('/').pop()!.replace('.png', '')
  return (
    <div
      className={`spell-card${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <div className="art">
        <AssetImage category="spells" assetKey={artKey} alt={spell.korean} />
      </div>
      <div className="word">{spell.korean}</div>
      <div className="meta">
        <span>Lv {spell.level}</span>
        <span>{damageForSpell(spell)} dmg</span>
      </div>
      <Bar value={spell.charge} max={spell.maxCharge} kind="charge" thin />
    </div>
  )
}
