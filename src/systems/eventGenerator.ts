import { eventWeights, maxRepeatEventStreak, type DungeonEventType } from '@/config/balance'

/**
 * Weighted random dungeon-event selection, independent of any UI. Prevents
 * the same event type from appearing more than `maxRepeatEventStreak`
 * times in a row.
 */
export function pickNextEventType(
  history: DungeonEventType[],
  rng: () => number = Math.random,
): DungeonEventType {
  const recentStreakType = currentStreakType(history)
  const streakLength = currentStreakLength(history)

  const candidates = (Object.entries(eventWeights) as [DungeonEventType, number][]).filter(([type]) => {
    if (type === recentStreakType && streakLength >= maxRepeatEventStreak) return false
    return true
  })

  const pool = candidates.length > 0 ? candidates : (Object.entries(eventWeights) as [DungeonEventType, number][])
  const totalWeight = pool.reduce((sum, [, w]) => sum + w, 0)
  let roll = rng() * totalWeight
  for (const [type, weight] of pool) {
    roll -= weight
    if (roll <= 0) return type
  }
  return pool[pool.length - 1][0]
}

function currentStreakType(history: DungeonEventType[]): DungeonEventType | null {
  return history.length > 0 ? history[history.length - 1] : null
}

function currentStreakLength(history: DungeonEventType[]): number {
  if (history.length === 0) return 0
  const last = history[history.length - 1]
  let count = 0
  for (let i = history.length - 1; i >= 0 && history[i] === last; i--) count++
  return count
}
