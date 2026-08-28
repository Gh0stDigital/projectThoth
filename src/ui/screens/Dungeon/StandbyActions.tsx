interface StandbyActionsProps {
  canEnterBoss: boolean
  bossDoorFound: boolean
  keyFound: boolean
  restAreaFound: boolean
  onMove: () => void
  onCheckTotem: () => void
  onCheckWords: () => void
  onUseItem: () => void
  onEnterBoss: () => void
  onReturnToRest: () => void
}

/**
 * The Standby hub menu — the player's safe beat between events. Every
 * action here is presentational; the store decides whether each one is
 * actually legal, so a stale render can't smuggle a Move through.
 */
export function StandbyActions({
  canEnterBoss,
  bossDoorFound,
  keyFound,
  restAreaFound,
  onMove,
  onCheckTotem,
  onCheckWords,
  onUseItem,
  onEnterBoss,
  onReturnToRest,
}: StandbyActionsProps) {
  return (
    <>
      <div className="room-actions">
        <button className="room-action primary" onClick={onMove}>
          <span className="icon">🚶</span>
          <span className="label">Move</span>
          <span className="sub">Press on into the dungeon</span>
        </button>
        <button className="room-action" onClick={onCheckTotem}>
          <span className="icon">🛡️</span>
          <span className="label">Check Totem</span>
          <span className="sub">Inspect your Totem</span>
        </button>
        <button className="room-action" onClick={onCheckWords}>
          <span className="icon">📖</span>
          <span className="label">Check Words</span>
          <span className="sub">Review this run's Spellwords</span>
        </button>
        <button className="room-action" onClick={onUseItem}>
          <span className="icon">🎒</span>
          <span className="label">Use Items</span>
          <span className="sub">Heal or recharge your deck</span>
        </button>
      </div>

      {/* Secondary destinations share a row so a hub with both discovered
          still fits a short phone without scrolling. */}
      {(restAreaFound || bossDoorFound) && (
        <div className="standby-extras">
          {restAreaFound && (
            <button className="btn btn-ghost" onClick={onReturnToRest}>
              ⛺ Rest Area
            </button>
          )}
          {bossDoorFound && (
            <button
              className={`btn ${canEnterBoss ? 'btn-danger' : 'btn-ghost'}`}
              disabled={!canEnterBoss}
              onClick={onEnterBoss}
            >
              {canEnterBoss ? '⚔️ Boss Door' : keyFound ? '🚪 Key used' : '🔒 Boss Door'}
            </button>
          )}
        </div>
      )}
    </>
  )
}
