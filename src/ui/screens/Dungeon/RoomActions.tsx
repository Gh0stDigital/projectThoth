import type { RoomKind } from '@/domain/dungeon'

const roomText: Record<RoomKind, { title: string; body: string }> = {
  entrance: {
    title: 'Dungeon Entrance',
    body: 'The way in stands open before you. Gather yourself before you set off.',
  },
  intermission: {
    title: 'Quiet Room',
    body: 'The passage widens into a still, empty room. Nothing threatens you here — for now.',
  },
}

interface RoomActionsProps {
  roomKind: RoomKind
  notice: string | null
  bossUnlocked: boolean
  onMove: () => void
  onCheckWords: () => void
  onUseItem: () => void
  onStatus: () => void
  onEnterBoss: () => void
}

/**
 * The between-events room menu. This is the player's "safe" beat: they
 * decide when to advance rather than being pushed into the next event.
 */
export function RoomActions({
  roomKind,
  notice,
  bossUnlocked,
  onMove,
  onCheckWords,
  onUseItem,
  onStatus,
  onEnterBoss,
}: RoomActionsProps) {
  const text = roomText[roomKind]
  return (
    <>
      <div className="room-flavor">
        <h3>{text.title}</h3>
        <p className="muted">{text.body}</p>
      </div>

      {notice && <div className="room-notice">{notice}</div>}

      <div className="room-actions">
        <button className="room-action primary" onClick={onMove}>
          <span className="icon">🚶</span>
          <span className="label">Move</span>
          <span className="sub">Press on into the dungeon</span>
        </button>
        <button className="room-action" onClick={onCheckWords}>
          <span className="icon">📖</span>
          <span className="label">Check Words</span>
          <span className="sub">Review this run's Spell Words</span>
        </button>
        <button className="room-action" onClick={onUseItem}>
          <span className="icon">🎒</span>
          <span className="label">Use Item</span>
          <span className="sub">Heal or recharge your deck</span>
        </button>
        <button className="room-action" onClick={onStatus}>
          <span className="icon">🛡️</span>
          <span className="label">Status</span>
          <span className="sub">Inspect your Totem</span>
        </button>
      </div>

      {bossUnlocked && (
        <button className="btn btn-danger btn-block" onClick={onEnterBoss}>
          ⚔️ Challenge the Boss
        </button>
      )}
    </>
  )
}
