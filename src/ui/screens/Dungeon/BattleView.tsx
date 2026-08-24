import { useEffect, useState } from 'react'
import { useDungeonStore } from '@/state/dungeonStore'
import { usePersistentStore } from '@/state/persistentStore'
import { visibleHand } from '@/systems/battleEngine'
import { AssetImage } from '@/ui/components/AssetImage'
import { Bar } from '@/ui/components/Bar'
import { SpellCard } from '@/ui/components/SpellCard'
import { TotemPanel } from '@/ui/components/TotemPanel'
import { ChallengeModal } from '@/ui/components/ChallengeModal'
import { ChallengeView } from './ChallengeView'
import { WordInfoPanel } from './WordInfoPanel'

export function BattleView() {
  const battle = useDungeonStore((s) => s.battle)!
  const run = useDungeonStore((s) => s.run)!
  const wordInfoOpen = useDungeonStore((s) => s.activePanel === 'words')
  const toggleWordInfo = useDungeonStore((s) => s.toggleWordInfo)
  const selectCard = useDungeonStore((s) => s.selectCard)
  const submitAttackAnswer = useDungeonStore((s) => s.submitAttackAnswer)
  const continueAfterPlayerResolve = useDungeonStore((s) => s.continueAfterPlayerResolve)
  const tickBattleTimer = useDungeonStore((s) => s.tickBattleTimer)
  const submitDefenseAnswer = useDungeonStore((s) => s.submitDefenseAnswer)
  const continueAfterEnemyResolve = useDungeonStore((s) => s.continueAfterEnemyResolve)
  const continueAfterVictory = useDungeonStore((s) => s.continueAfterVictory)
  const continueAfterDefeat = useDungeonStore((s) => s.continueAfterDefeat)

  const spells = usePersistentStore((s) => s.spells)
  const totem = usePersistentStore((s) => s.totems.find((t) => t.id === run.config.totemId))!

  // Pause the enemy-attack timer whenever the tab is hidden or the Word
  // Information panel is open over the battle.
  const [documentVisible, setDocumentVisible] = useState(!document.hidden)
  useEffect(() => {
    const handler = () => setDocumentVisible(!document.hidden)
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  useEffect(() => {
    if (battle.phase !== 'enemy_challenge' || !battle.timer?.running) return
    if (wordInfoOpen || !documentVisible) return
    const id = window.setInterval(() => tickBattleTimer(0.25), 250)
    return () => window.clearInterval(id)
  }, [battle.phase, battle.timer?.running, wordInfoOpen, documentVisible, tickBattleTimer])

  const handIds = visibleHand(battle)
  const handSpells = handIds.map((id) => spells.find((s) => s.id === id)).filter((s): s is (typeof spells)[number] => !!s)
  const plateauRemaining = battle.plateau ? battle.plateau.filter((r) => !r.cleared).length : 0
  const lastLog = battle.log[battle.log.length - 1] ?? ''

  return (
    <div className="screen">
      <div className="row">
        <span className="faint">{battle.isBoss ? '⚔️ BOSS BATTLE' : '⚔️ BATTLE'}</span>
        <button className="btn btn-ghost btn-sm" onClick={toggleWordInfo}>
          ℹ️ Words
        </button>
      </div>

      <div className="scene-window battle">
        <AssetImage category="locations" assetKey={run.config.locationKey} alt="Dungeon location" />
        <div className="battle-enemy-overlay">
          <AssetImage category={battle.enemy.imageCategory} assetKey={battle.enemy.imageKey} alt={battle.enemy.name} />
        </div>
        <span className="scene-tag">{battle.enemy.name}</span>
      </div>

      <TotemPanel totem={totem} compact />

      <div className="enemy-hp-row">
        <div className="row">
          <span>{battle.enemy.name}</span>
          <span className="faint">
            {battle.enemy.currentHp}/{battle.enemy.maxHp} HP
          </span>
        </div>
        <Bar value={battle.enemy.currentHp} max={battle.enemy.maxHp} kind="hp" />
      </div>

      {battle.isBoss && battle.plateau && plateauRemaining > 0 && (
        <div className="plateau-banner">
          🛡️ Plateau active — {plateauRemaining} word{plateauRemaining === 1 ? '' : 's'} remain to break the barrier. Normal
          damage is blocked until then.
        </div>
      )}

      {battle.phase === 'player_select' && (
        <>
          <p className="muted" style={{ textAlign: 'center' }}>
            Choose a Spell to attack with:
          </p>
          <div className="hand-scroll">
            {handSpells.map((spell) => (
              <SpellCard key={spell.id} spell={spell} onClick={() => selectCard(spell.id)} />
            ))}
          </div>
          {handSpells.length === 0 && (
            <p className="faint" style={{ textAlign: 'center' }}>
              No Spells equipped to this Totem — visit the Totem screen after this battle.
            </p>
          )}
        </>
      )}

      {battle.phase === 'player_challenge' && battle.activeChallenge && (
        <ChallengeModal>
          <ChallengeView challenge={battle.activeChallenge} onSubmit={submitAttackAnswer} submitLabel="Attack!" />
        </ChallengeModal>
      )}

      {battle.phase === 'player_resolve' && (
        <>
          <div className={`feedback-banner ${battle.lastResult ?? ''}`}>{lastLog}</div>
          <button className="btn btn-primary btn-block" onClick={continueAfterPlayerResolve}>
            Continue →
          </button>
        </>
      )}

      {battle.phase === 'enemy_challenge' && battle.activeChallenge && battle.timer && (
        <ChallengeModal>
          <div className="timer-row">
            <span>⏱ {Math.ceil(battle.timer.remainingSeconds)}s</span>
            <div style={{ flex: 1 }}>
              <Bar value={battle.timer.remainingSeconds} max={battle.timer.totalSeconds} kind="timer" thin />
            </div>
          </div>
          <ChallengeView challenge={battle.activeChallenge} onSubmit={submitDefenseAnswer} submitLabel="Defend!" />
        </ChallengeModal>
      )}

      {battle.phase === 'enemy_resolve' && (
        <>
          <div className={`feedback-banner ${battle.lastResult ?? ''}`}>{lastLog}</div>
          <button className="btn btn-primary btn-block" onClick={continueAfterEnemyResolve}>
            Continue →
          </button>
        </>
      )}

      {battle.phase === 'victory' && (
        <>
          <div className="feedback-banner correct">🎉 Victory! {battle.enemy.name} is defeated.</div>
          <button className="btn btn-primary btn-block" onClick={continueAfterVictory}>
            Continue →
          </button>
        </>
      )}

      {battle.phase === 'defeat' && (
        <>
          <div className="feedback-banner incorrect">💀 Your Totem has fallen...</div>
          <button className="btn btn-primary btn-block" onClick={continueAfterDefeat}>
            Return to Menu
          </button>
        </>
      )}

      <div style={{ flex: 1 }} />

      {wordInfoOpen && <WordInfoPanel run={run} battle={battle} onClose={toggleWordInfo} />}
    </div>
  )
}
