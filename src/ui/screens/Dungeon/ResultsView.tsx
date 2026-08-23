import { useUiStore } from '@/state/uiStore'
import { useDungeonStore } from '@/state/dungeonStore'
import { usePersistentStore } from '@/state/persistentStore'

export function ResultsView() {
  const goTo = useUiStore((s) => s.goTo)
  const stats = useDungeonStore((s) => s.resultsStats)
  const exitToMenu = useDungeonStore((s) => s.exitToMenu)
  const spells = usePersistentStore((s) => s.spells)

  if (!stats) {
    exitToMenu()
    return null
  }

  const accuracy = stats.correctAnswers + stats.incorrectAnswers > 0
    ? Math.round((stats.correctAnswers / (stats.correctAnswers + stats.incorrectAnswers)) * 100)
    : 0

  const masteredWords = stats.newlyMasteredWords.map((id) => spells.find((s) => s.id === id)?.korean).filter(Boolean)

  return (
    <div className="screen screen-scroll">
      <div className="menu-title">
        <span className="glyph">🏆</span>
        <h1>{stats.bossDefeated ? 'Boss Defeated!' : 'Dungeon Ended'}</h1>
        <p className="muted">Floor {stats.floorCompleted ? 'complete' : 'incomplete'}</p>
      </div>

      <div className="results-grid">
        <Stat label="Events Encountered" value={stats.eventsEncountered} />
        <Stat label="Monsters Defeated" value={stats.monstersDefeated} />
        <Stat label="Treasure Collected" value={stats.treasureCollected} />
        <Stat label="Money Earned" value={`💰 ${stats.moneyEarned}`} />
        <Stat label="Totem XP Earned" value={stats.totemXpEarned} />
        <Stat label="Spell XP Earned" value={stats.spellXpEarned} />
        <Stat label="Correct Answers" value={stats.correctAnswers} />
        <Stat label="Incorrect Answers" value={stats.incorrectAnswers} />
        <Stat label="Accuracy" value={`${accuracy}%`} />
        <Stat label="Spell Level-Ups" value={stats.spellLevelUps.length} />
      </div>

      {masteredWords.length > 0 && (
        <div className="panel">
          <h3>Newly Mastered Words</h3>
          <p>{masteredWords.join(', ')}</p>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <div className="btn-row">
        <button
          className="btn btn-primary btn-block"
          onClick={() => {
            exitToMenu()
          }}
        >
          New Dungeon
        </button>
      </div>
      <button
        className="btn btn-ghost btn-block"
        onClick={() => {
          exitToMenu()
          goTo('menu')
        }}
      >
        Main Menu
      </button>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-tile">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  )
}
