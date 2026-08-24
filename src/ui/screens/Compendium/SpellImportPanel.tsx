import { useMemo, useRef, useState } from 'react'
import { usePersistentStore } from '@/state/persistentStore'
import { parseImportText, importRowsToInputs } from '@/systems/spellImport'

const PLACEHOLDER = `안녕하세요, hello
감사합니다, thank you
사랑	love (noun)
# lines starting with # are ignored`

interface SpellImportPanelProps {
  onDone: () => void
  onCancel: () => void
}

/**
 * Batch Spell Word import. Paste text or load a .txt/.csv file, preview
 * what will happen line-by-line, then commit. Entirely local — the file
 * is read in-browser via FileReader and never leaves the device.
 */
export function SpellImportPanel({ onDone, onCancel }: SpellImportPanelProps) {
  const spells = usePersistentStore((s) => s.spells)
  const bulkCreateSpells = usePersistentStore((s) => s.bulkCreateSpells)
  const createSpellSet = usePersistentStore((s) => s.createSpellSet)

  const [text, setText] = useState('')
  const [makeSet, setMakeSet] = useState(true)
  const [setName, setSetName] = useState('')
  const [imported, setImported] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const result = useMemo(() => parseImportText(text, spells), [text, spells])
  const hasContent = text.trim().length > 0

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result ?? ''))
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleImport() {
    if (result.ok.length === 0) return
    const created = bulkCreateSpells(importRowsToInputs(result.ok))
    if (makeSet && created.length > 0) {
      const name = setName.trim() || `Imported Set (${created.length})`
      createSpellSet(name, created.map((s) => s.id))
    }
    setImported(created.length)
  }

  if (imported !== null) {
    return (
      <div className="list">
        <div className="empty-state">
          <span className="glyph">✅</span>
          <p>
            Imported {imported} Spell Word{imported === 1 ? '' : 's'}
            {makeSet ? ' and created a Spell Set from them.' : '.'}
          </p>
        </div>
        <button className="btn btn-primary btn-block" onClick={onDone}>
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="list">
      <div className="field">
        <label htmlFor="import-text">Paste your word list</label>
        <textarea
          id="import-text"
          rows={7}
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
        />
        <p className="faint">
          One word per line: Korean first, then English — separated by a comma, tab, or pipe. Pasting straight from a
          spreadsheet works too. An optional third column adds notes, and a header row is detected and skipped
          automatically.
        </p>
      </div>

      <div className="btn-row">
        <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()}>
          📄 Load .txt / .csv file
        </button>
        {hasContent && (
          <button className="btn btn-ghost btn-sm" onClick={() => setText('')}>
            Clear
          </button>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept=".txt,.csv" style={{ display: 'none' }} onChange={handleFile} />

      {hasContent && (
        <>
          <div className="import-summary">
            <span className="import-count ok">✓ {result.ok.length} ready</span>
            {result.duplicates.length > 0 && (
              <span className="import-count duplicate">⚠ {result.duplicates.length} duplicate</span>
            )}
            {result.errors.length > 0 && <span className="import-count error">✕ {result.errors.length} error</span>}
          </div>

          <div className="import-preview">
            {result.rows.map((row) => (
              <div key={row.line} className={`import-row ${row.status}`}>
                <span className="import-row-line">{row.line}</span>
                <div className="import-row-body">
                  {row.status === 'ok' ? (
                    <span>
                      {row.korean} <span className="faint">— {row.english}</span>
                    </span>
                  ) : (
                    <>
                      <span className="faint">{row.raw}</span>
                      <span className={`import-row-message ${row.status}`}>{row.message}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="field">
            <label className="row-start" style={{ gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={makeSet} onChange={(e) => setMakeSet(e.target.checked)} />
              Also create a Spell Set from these words
            </label>
            {makeSet && (
              <input
                type="text"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder={`Imported Set (${result.ok.length})`}
              />
            )}
          </div>
        </>
      )}

      <div className="btn-row">
        <button className="btn btn-primary btn-block" onClick={handleImport} disabled={result.ok.length === 0}>
          Import {result.ok.length > 0 ? result.ok.length : ''} Word{result.ok.length === 1 ? '' : 's'}
        </button>
      </div>
      <button className="btn btn-ghost btn-block" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}
