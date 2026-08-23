import { useState } from 'react'
import type { Spell } from '@/domain/spell'
import { usePersistentStore } from '@/state/persistentStore'
import { validateNewSpell } from '@/systems/spellFactory'

interface SpellEditorFormProps {
  existing?: Spell
  onDone: () => void
  onCancel: () => void
}

/**
 * Create/edit form for a single Spell Word. No semantic validation is
 * performed — only basic empty-field checks, per the prototype's scope.
 * Native `spellCheck` provides light spelling assistance without any AI or
 * dictionary lookups.
 */
export function SpellEditorForm({ existing, onDone, onCancel }: SpellEditorFormProps) {
  const createSpell = usePersistentStore((s) => s.createSpell)
  const editSpell = usePersistentStore((s) => s.editSpell)

  const [korean, setKorean] = useState(existing?.korean ?? '')
  const [english, setEnglish] = useState(existing?.english ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [errors, setErrors] = useState<{ korean?: string; english?: string }>({})

  function handleSave() {
    const validation = validateNewSpell({ korean, english })
    if (validation.length > 0) {
      const next: { korean?: string; english?: string } = {}
      for (const e of validation) next[e.field] = e.message
      setErrors(next)
      return
    }
    if (existing) {
      editSpell(existing.id, { korean, english, notes })
    } else {
      createSpell({ korean, english, notes })
    }
    onDone()
  }

  return (
    <div className="list">
      <div className="field">
        <label htmlFor="kor-input">Korean word or expression</label>
        <input
          id="kor-input"
          type="text"
          lang="ko"
          value={korean}
          onChange={(e) => setKorean(e.target.value)}
          placeholder="예: 안녕하세요"
        />
        {errors.korean && <span className="field-error">{errors.korean}</span>}
      </div>

      <div className="field">
        <label htmlFor="eng-input">English meaning</label>
        <input
          id="eng-input"
          type="text"
          lang="en"
          spellCheck
          value={english}
          onChange={(e) => setEnglish(e.target.value)}
          placeholder="e.g. hello"
        />
        {errors.english && <span className="field-error">{errors.english}</span>}
      </div>

      <div className="field">
        <label htmlFor="notes-input">Notes (optional)</label>
        <textarea
          id="notes-input"
          rows={3}
          spellCheck
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Usage notes, mnemonics, example sentences..."
        />
      </div>

      <div className="btn-row">
        <button className="btn btn-primary btn-block" onClick={handleSave}>
          {existing ? 'Save Changes' : 'Create Spell'}
        </button>
      </div>
      <button className="btn btn-ghost btn-block" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}
