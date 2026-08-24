import { useState } from 'react'
import type { DungeonEventAction, DungeonEvent, DungeonRunState } from '@/domain/dungeon'
import { useDungeonStore, challengedCount } from '@/state/dungeonStore'
import { usePersistentStore } from '@/state/persistentStore'
import { AssetImage } from '@/ui/components/AssetImage'
import { TypewriterText } from '@/ui/components/TypewriterText'
import { ProgressMeter } from '@/ui/components/ProgressMeter'
import { TotemPanel } from '@/ui/components/TotemPanel'
import { ChallengeModal } from '@/ui/components/ChallengeModal'
import { ChallengeView } from './ChallengeView'
import { WordInfoPanel } from './WordInfoPanel'
import { ItemPanel } from './ItemPanel'
import { StatusPanel } from './StatusPanel'
import { RoomActions } from './RoomActions'

function actionLabel(action: DungeonEventAction, event: DungeonEvent): string {
  if (action === 'attempt' && event.type === 'monster') return '⚔️ Fight'
  switch (action) {
    case 'proceed':
      return event.type === 'special' && event.actions.includes('enter_boss') ? 'Keep Exploring' : 'Continue'
    case 'attempt':
      return 'Investigate'
    case 'flee':
      return 'Flee'
    case 'enter_boss':
      return '⚔️ Enter Boss Room'
    case 'skip':
      return 'Skip'
    default:
      return action
  }
}

/** Owns its own "has the text finished typing" state, reset by React when `key` changes. */
function EventBody({
  event,
  charsPerSecond,
  onChooseAction,
}: {
  event: DungeonEvent
  charsPerSecond: number
  onChooseAction: (action: DungeonEventAction) => void
}) {
  const [revealed, setRevealed] = useState(false)
  return (
    <>
      <TypewriterText lines={event.bodyText} charsPerSecond={charsPerSecond} onRevealed={() => setRevealed(true)} />
      {revealed && (
        <div className="action-bar">
          {event.actions.map((action) => (
            <button key={action} className="btn btn-primary" onClick={() => onChooseAction(action)}>
              {actionLabel(action, event)}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function ResolutionBody({
  run,
  charsPerSecond,
  onContinue,
}: {
  run: DungeonRunState
  charsPerSecond: number
  onContinue: () => void
}) {
  const [revealed, setRevealed] = useState(false)
  return (
    <>
      <TypewriterText
        lines={run.lastOutcomeText}
        charsPerSecond={charsPerSecond}
        onTapComplete={onContinue}
        onRevealed={() => setRevealed(true)}
      />
      {revealed && (
        <button className="btn btn-primary btn-block" onClick={onContinue}>
          Continue →
        </button>
      )}
    </>
  )
}

export function ExploreView() {
  const run = useDungeonStore((s) => s.run)!
  const activePanel = useDungeonStore((s) => s.activePanel)
  const openPanel = useDungeonStore((s) => s.openPanel)
  const closePanel = useDungeonStore((s) => s.closePanel)
  const toggleWordInfo = useDungeonStore((s) => s.toggleWordInfo)
  const chooseEventAction = useDungeonStore((s) => s.chooseEventAction)
  const submitEventChallengeAnswer = useDungeonStore((s) => s.submitEventChallengeAnswer)
  const continueExploring = useDungeonStore((s) => s.continueExploring)
  const moveToNextEvent = useDungeonStore((s) => s.moveToNextEvent)
  const enterBossFromRoom = useDungeonStore((s) => s.enterBossFromRoom)
  const useItem = useDungeonStore((s) => s.useItem)
  const exitToMenu = useDungeonStore((s) => s.exitToMenu)

  const totems = usePersistentStore((s) => s.totems)
  const spellSets = usePersistentStore((s) => s.spellSets)
  const inventory = usePersistentStore((s) => s.inventory)
  const charsPerSecond = usePersistentStore((s) => s.settings.typewriterCharsPerSecond)
  const totem = totems.find((t) => t.id === run.config.totemId)!
  const totemSet = spellSets.find((s) => s.id === run.config.totemSpellSetId) ?? null

  const event = run.currentEvent
  const inRoom = run.phase === 'room'
  if (!inRoom && !event) return null

  const challenged = challengedCount(run)
  const total = run.config.dungeonWordIds.length
  const showPersistentBossButton =
    run.bossUnlocked && run.phase === 'event' && !!event && !event.actions.includes('enter_boss')

  return (
    <div className="screen">
      <div className="row">
        <button className="btn btn-ghost btn-sm" onClick={exitToMenu}>
          ✕ Exit Dungeon
        </button>
      </div>

      <div className="scene-window">
        <AssetImage category="locations" assetKey={run.config.locationKey} alt="Dungeon location" />
        {event && (
          <div className="explore-event-overlay">
            <AssetImage category={event.imageCategory} assetKey={event.imageKey} alt={event.title} />
          </div>
        )}
        <span className="scene-tag">
          {inRoom ? (run.roomKind === 'entrance' ? 'Entrance' : 'Intermission') : event!.title}
        </span>
      </div>

      <TotemPanel totem={totem} />

      <ProgressMeter challenged={challenged} total={total} bossUnlocked={run.bossUnlocked} onOpenWordInfo={toggleWordInfo} />

      {inRoom && (
        <RoomActions
          roomKind={run.roomKind}
          notice={run.roomNotice}
          bossUnlocked={run.bossUnlocked}
          onMove={moveToNextEvent}
          onCheckWords={() => openPanel('words')}
          onUseItem={() => openPanel('items')}
          onStatus={() => openPanel('status')}
          onEnterBoss={enterBossFromRoom}
        />
      )}

      {run.phase === 'event' && event && (
        <EventBody key={event.id} event={event} charsPerSecond={charsPerSecond} onChooseAction={chooseEventAction} />
      )}

      {run.phase === 'challenge' && event?.challenge && (
        <ChallengeModal>
          <ChallengeView challenge={event.challenge} onSubmit={submitEventChallengeAnswer} />
        </ChallengeModal>
      )}

      {run.phase === 'resolution' && (
        <ResolutionBody key={event?.id ?? 'resolution'} run={run} charsPerSecond={charsPerSecond} onContinue={continueExploring} />
      )}

      <div style={{ flex: 1 }} />

      {showPersistentBossButton && (
        <button className="btn btn-danger btn-block" onClick={() => chooseEventAction('enter_boss')}>
          ⚔️ Challenge the Boss
        </button>
      )}

      {activePanel === 'words' && <WordInfoPanel run={run} battle={null} onClose={closePanel} />}
      {activePanel === 'items' && <ItemPanel inventory={inventory} onUse={useItem} onClose={closePanel} />}
      {activePanel === 'status' && (
        <StatusPanel totem={totem} run={run} totemSet={totemSet} challenged={challenged} onClose={closePanel} />
      )}
    </div>
  )
}
