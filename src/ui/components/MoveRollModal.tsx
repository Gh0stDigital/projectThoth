import { useEffect, useState } from 'react'

const DIE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

/** How long the die tumbles before settling, and how fast faces cycle. */
const ROLL_MS = 900
const TICK_MS = 80

interface MoveRollModalProps {
  /** Shown once the die settles — the event the player just walked into. */
  resultTitle: string | null
  onDone: () => void
}

/**
 * Dice-roll overlay shown when the player chooses Move. Renders *inside*
 * the scene window (as an absolutely-positioned layer over the location
 * art) rather than as a full-screen sheet, so the roll reads as something
 * happening in the room itself. The die tumbles for a beat, settles, then
 * reveals what lies ahead.
 */
export function MoveRollModal({ resultTitle, onDone }: MoveRollModalProps) {
  const [face, setFace] = useState(0)
  const [settled, setSettled] = useState(false)

  // Cycle faces while rolling.
  useEffect(() => {
    if (settled) return
    const id = window.setInterval(() => setFace((f) => (f + 1) % DIE_FACES.length), TICK_MS)
    return () => window.clearInterval(id)
  }, [settled])

  // Settle on a final face after the roll duration.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setFace(Math.floor(Math.random() * DIE_FACES.length))
      setSettled(true)
    }, ROLL_MS)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div className="move-roll-overlay">
      <div className="move-roll-label">{settled ? 'You press onward…' : 'Rolling…'}</div>
      <div className={`move-roll-die${settled ? ' settled' : ' rolling'}`} aria-live="polite">
        {DIE_FACES[face]}
      </div>
      {settled && resultTitle && <div className="move-roll-result">{resultTitle}</div>}
      <button className="btn btn-primary btn-sm move-roll-btn" disabled={!settled} onClick={onDone}>
        {settled ? 'Continue →' : '…'}
      </button>
    </div>
  )
}
