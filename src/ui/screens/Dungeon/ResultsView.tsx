import { useUiStore } from '@/state/uiStore'
import { useDungeonStore } from '@/state/dungeonStore'
import { getItemDef } from '@/config/items'
import { pct, type WordReportRow } from '@/systems/runResults'
import type { ItemId } from '@/domain/item'

/**
 * End-of-run report.
 *
 * Purely a readout: every reward was already credited at the moment it was
 * earned, so rendering (or re-rendering) this screen can never grant
 * anything a second time.
 */
export function ResultsView() {
  const goTo = useUiStore((s) => s.goTo)
  const report = useDungeonStore((s) => s.report)
  const exitToMenu = useDungeonStore((s) => s.exitToMenu)

  if (!report) {
    exitToMenu()
    return null
  }

  const glyph = report.outcome === 'victory' ? '🏆' : report.outcome === 'abandoned' ? '🚪' : '💀'
  const attempted = report.words.filter((w) => w.correct + w.incorrect > 0)
  const itemCounts = report.itemsCollected.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="screen screen-scroll">
      <div className="menu-title">
        <span className="glyph">{glyph}</span>
        <h1>{report.title}</h1>
        <p className="muted">
          {report.turns} turn{report.turns === 1 ? '' : 's'} · {pct(report.totalAccuracy)} accuracy
        </p>
      </div>

      {/* ---- Totem outcome ---- */}
      <div className={`panel totem-outcome ${report.totemDestroyed ? 'destroyed' : ''}`}>
        <div className="row">
          <span>❤️ {report.totemHp}/{report.totemMaxHp}</span>
          <span>
            ◆ {report.lifePointsRemaining} Life Point{report.lifePointsRemaining === 1 ? '' : 's'}
          </span>
        </div>
        {report.lifePointLost && <p className="faint">You lost 1 Life Point.</p>}
        {report.totemDestroyed && (
          <p className="destroyed-note">
            Your Totem has been destroyed permanently. Raise a new one from the Totem screen.
          </p>
        )}
        {report.totemLevelAfter > report.totemLevelBefore && (
          <p className="faint">
            Totem reached level {report.totemLevelAfter} (from {report.totemLevelBefore}).
          </p>
        )}
      </div>

      {/* ---- Run totals ---- */}
      <div className="results-grid">
        <Stat label="Turns Taken" value={report.turns} />
        <Stat label="Money Earned" value={`💰 ${report.moneyEarned}`} />
        <Stat label="Totem XP" value={report.totemXpEarned} />
        <Stat label="Spell XP" value={report.spellXpEarned} />
        <Stat label="Enemies Defeated" value={report.enemiesDefeated} />
        <Stat label="Mimics Defeated" value={report.mimicsDefeated} />
        <Stat label="Treasure Collected" value={report.treasureCollected} />
        <Stat label="Rests Used" value={report.restsUsed} />
      </div>

      {/* ---- Accuracy ---- */}
      <div className="panel">
        <h3>Vocabulary Accuracy</h3>
        <div className="results-grid">
          <Stat label="Overall" value={pct(report.totalAccuracy)} />
          <Stat label="Attack" value={pct(report.attackAccuracy)} />
          <Stat label="Defense" value={pct(report.defenseAccuracy)} />
          <Stat label="Correct / Wrong" value={`${report.totalCorrect} / ${report.totalIncorrect}`} />
        </div>
      </div>

      {/* ---- Items ---- */}
      {Object.keys(itemCounts).length > 0 && (
        <div className="panel">
          <h3>Items &amp; Treasure</h3>
          <div className="reward-lines">
            {Object.entries(itemCounts).map(([id, count]) => {
              const def = getItemDef(id as ItemId)
              return (
                <span key={id} className="reward-line">
                  {def.icon} {def.name} ×{count}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* ---- Words the player struggled with ---- */}
      {report.struggled.length > 0 && (
        <div className="panel">
          <h3>Words to Review</h3>
          <div className="list">
            {report.struggled.map((w) => (
              <WordRow key={w.spellId} word={w} />
            ))}
          </div>
        </div>
      )}

      {/* ---- Full per-word performance ---- */}
      <div className="panel">
        <h3>Every Word ({attempted.length}/{report.words.length} attempted)</h3>
        <div className="list">
          {report.words.map((w) => (
            <WordRow key={w.spellId} word={w} />
          ))}
        </div>
      </div>

      {report.levelUps.length > 0 && (
        <div className="panel">
          <h3>Spell Level-Ups</h3>
          <p>
            {report.levelUps.map((l) => `${l.korean} ${l.from}→${l.to}`).join(' · ')}
          </p>
        </div>
      )}

      {report.masteredWords.length > 0 && (
        <div className="panel">
          <h3>Newly Mastered</h3>
          <p>{report.masteredWords.join(', ')}</p>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <button
        className="btn btn-primary btn-block"
        onClick={() => {
          exitToMenu()
          goTo('menu')
        }}
      >
        Return to Main Menu
      </button>
    </div>
  )
}

function WordRow({ word }: { word: WordReportRow }) {
  const attempts = word.correct + word.incorrect
  return (
    <div className="word-report-row">
      <span className={`status-dot ${word.introduced ? 'done' : 'pending'}`} />
      <div className="word-report-body">
        <div className="word-report-word">
          {word.korean} <span className="faint">— {word.english}</span>
        </div>
        <div className="faint word-report-meta">
          {attempts === 0 ? (
            'Never attempted'
          ) : (
            <>
              {word.correct}✓ / {word.incorrect}✗ · {pct(word.accuracy)}
              {word.attackTotal > 0 && ` · atk ${pct(word.attackAccuracy)}`}
              {word.defenseTotal > 0 && ` · def ${pct(word.defenseAccuracy)}`}
            </>
          )}
        </div>
      </div>
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
