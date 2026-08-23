interface ProgressMeterProps {
  challenged: number
  total: number
  bossUnlocked: boolean
  onOpenWordInfo?: () => void
}

export function ProgressMeter({ challenged, total, bossUnlocked, onOpenWordInfo }: ProgressMeterProps) {
  return (
    <div className="progress-meter">
      <span>
        Words challenged: <b>{challenged}/{total}</b>
      </span>
      <span className={`boss-status ${bossUnlocked ? 'open' : 'locked'}`}>
        {bossUnlocked ? 'Boss: OPEN' : 'Boss: locked'}
      </span>
      {onOpenWordInfo && (
        <button className="btn btn-ghost btn-sm" onClick={onOpenWordInfo}>
          ℹ️ Words
        </button>
      )}
    </div>
  )
}
