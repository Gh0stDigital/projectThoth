import { useCallback, useState } from 'react'
import type { DungeonEventAction, DungeonEvent, DungeonRunState } from '@/domain/dungeon'
import { useDungeonStore, challengedCount } from '@/state/dungeonStore'
import { usePersistentStore } from '@/state/persistentStore'
import { AssetImage } from '@/ui/components/AssetImage'
import { TypewriterText } from '@/ui/components/TypewriterText'
import { ProgressMeter } from '@/ui/components/ProgressMeter'
import { DungeonProgressTrack } from '@/ui/components/DungeonProgressTrack'
import { TotemPanel } from '@/ui/components/TotemPanel'
import { MoveRollModal } from '@/ui/components/MoveRollModal'
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

/**
 * The dialogue box only — its buttons render separately, down in the hub's
 * action slot, so everything tappable sits together at the bottom.
 */
function EventDialogue({
  event,
  charsPerSecond,
  onRevealed,
}: {
  event: DungeonEvent
  charsPerSecond: number
  onRevealed: () => void
}) {
  return <TypewriterText lines={event.bodyText} charsPerSecond={charsPerSecond} onRevealed={onRevealed} />
}

function ResolutionDialogue({
  run,
  charsPerSecond,
  onContinue,
  onRevealed,
}: {
  run: DungeonRunState
  charsPerSecond: number
  onContinue: () => void
  onRevealed: () => void
}) {
  return (
    <TypewriterText
      lines={run.lastOutcomeText}
      charsPerSecond={charsPerSecond}
      onTapComplete={onContinue}
      onRevealed={onRevealed}
    />
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

  const allSpells = usePersistentStore((s) => s.spells)
  const totems = usePersistentStore((s) => s.totems)
  const spellSets = usePersistentStore((s) => s.spellSets)
  const inventory = usePersistentStore((s) => s.inventory)
  const charsPerSecond = usePersistentStore((s) => s.settings.typewriterCharsPerSecond)
  const totem = totems.find((t) => t.id === run.config.totemId)!
  const totemSet = spellSets.find((s) => s.id === run.config.totemSpellSetId) ?? null

  // The Move action rolls a die in a popup; the underlying event is
  // generated immediately so the roll can reveal what was found, but the
  // player stays on the modal until they dismiss it.
  const [rolling, setRolling] = useState(false)
  const [rollSettled, setRollSettled] = useState(false)
  const handleMove = useCallback(() => {
    setRollSettled(false)
    setRolling(true)
    moveToNextEvent()
  }, [moveToNextEvent])

  // Answer + decoy tiles for the active challenge, both drawn from this
  // run's own word pool so decoys are words the player is actually studying.
  const challengeSpell = run.currentEvent?.challenge
    ? allSpells.find((sp) => sp.id === run.currentEvent!.challenge!.spellId)
    : undefined
  const answersInRun = run.config.dungeonWordIds
    .map((id) => allSpells.find((sp) => sp.id === id))
    .filter((sp): sp is (typeof allSpells)[number] => !!sp)

  const event = run.currentEvent
  const dialogueKey = `${run.phase}:${event?.id ?? 'none'}`
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const dialogueRevealed = revealedKey === dialogueKey

  // Treat the screen as "still in the room" while the die is rolling: the
  // next event is already generated (so the roll can name it), but
  // revealing it behind the modal would spoil the roll.
  const inRoom = run.phase === 'room' || rolling
  if (!inRoom && !event) return null

  const challenged = challengedCount(run)
  const total = run.config.dungeonWordIds.length
  const showPersistentBossButton =
    run.bossUnlocked && run.phase === 'event' && !!event && !event.actions.includes('enter_boss')

  return (
    <div className="screen" data-challenge={run.phase === 'challenge' ? 'true' : undefined}>
      <div className="row">
        <button className="btn btn-ghost btn-sm" onClick={exitToMenu}>
          ✕ Exit Dungeon
        </button>
      </div>

      <DungeonProgressTrack challenged={challenged} total={total} bossUnlocked={run.bossUnlocked} />

      <div className="scene-window dungeon">
        <AssetImage category="locations" assetKey={run.config.locationKey} alt="Dungeon location" />
        {event && !inRoom && (
          <div className="explore-event-overlay">
            <AssetImage category={event.imageCategory} assetKey={event.imageKey} alt={event.title} />
          </div>
        )}
        <span className="scene-tag">
          {inRoom ? (run.roomKind === 'entrance' ? 'Entrance' : 'Intermission') : event!.title}
        </span>
        {rolling && <MoveRollModal resultTitle={event?.title ?? null} onSettled={() => setRollSettled(true)} />}
      </div>

      {run.phase === 'event' && event && !rolling && (
        <EventDialogue
          key={dialogueKey}
          event={event}
          charsPerSecond={charsPerSecond}
          onRevealed={() => setRevealedKey(dialogueKey)}
        />
      )}

      {run.phase === 'resolution' && (
        <ResolutionDialogue
          key={dialogueKey}
          run={run}
          charsPerSecond={charsPerSecond}
          onContinue={continueExploring}
          onRevealed={() => setRevealedKey(dialogueKey)}
        />
      )}

      <TotemPanel totem={totem} compact />

      <ProgressMeter challenged={challenged} total={total} bossUnlocked={run.bossUnlocked} onOpenWordInfo={toggleWordInfo} />

      {inRoom && run.phase === 'room' && (
        <RoomActions
          roomKind={run.roomKind}
          notice={run.roomNotice}
          bossUnlocked={run.bossUnlocked}
          onMove={handleMove}
          onCheckWords={() => openPanel('words')}
          onUseItem={() => openPanel('items')}
          onStatus={() => openPanel('status')}
          onEnterBoss={enterBossFromRoom}
        />
      )}

      {rolling && (
        <button
          className="btn btn-primary btn-block"
          disabled={!rollSettled}
          onClick={() => setRolling(false)}
        >
          {rollSettled ? 'Continue →' : 'Rolling…'}
        </button>
      )}

      {run.phase === 'event' && event && !rolling && dialogueRevealed && (
        <div className="action-bar">
          {event.actions.map((action) => (
            <button key={action} className="btn btn-primary" onClick={() => chooseEventAction(action)}>
              {actionLabel(action, event)}
            </button>
          ))}
        </div>
      )}

      {run.phase === 'resolution' && dialogueRevealed && (
        <button className="btn btn-primary btn-block" onClick={continueExploring}>
          Continue →
        </button>
      )}

      {run.phase === 'challenge' && event?.challenge && challengeSpell && (
        <ChallengeView
          challenge={event.challenge}
          answer={event.challenge.direction === 'eng_to_kor' ? challengeSpell.korean : challengeSpell.english}
          decoyPool={answersInRun.map((sp) =>
            event.challenge!.direction === 'eng_to_kor' ? sp.korean : sp.english,
          )}
          onSubmit={submitEventChallengeAnswer}
        />
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
