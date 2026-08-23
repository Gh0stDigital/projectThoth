import type { AssetCategory } from '@/config/assets'
import type { DungeonEventType } from '@/config/balance'
import type { ChallengeContext } from '@/domain/challenge'
import type { DungeonEventAction } from '@/domain/dungeon'

/**
 * Static flavor/content table for each dungeon event type. Pure data — no
 * React, no state. dungeonSession.ts consults this when building a
 * DungeonEvent; the UI only ever renders the resulting DungeonEvent object.
 */
export interface EventDefinition {
  type: DungeonEventType
  title: string
  bodyText: string[]
  imageCategory: AssetCategory
  imageKey: string
  hasChallenge: boolean
  challengeContext: ChallengeContext
  actions: DungeonEventAction[]
}

export const eventDefinitions: Record<DungeonEventType, EventDefinition> = {
  empty: {
    type: 'empty',
    title: 'Quiet Passage',
    bodyText: ['The corridor stretches on, empty and still.', 'Nothing stirs here — you press onward.'],
    imageCategory: 'events',
    imageKey: 'empty',
    hasChallenge: false,
    challengeContext: 'event',
    actions: ['proceed'],
  },
  branch: {
    type: 'branch',
    title: 'Branching Path',
    bodyText: ['The path splits ahead.', 'You pick a direction and keep moving.'],
    imageCategory: 'events',
    imageKey: 'branch',
    hasChallenge: false,
    challengeContext: 'event',
    actions: ['proceed'],
  },
  trap: {
    type: 'trap',
    title: 'A Trap!',
    bodyText: ['You hear a click underfoot.', 'Quick — recall the word to disarm it before it triggers!'],
    imageCategory: 'traps',
    imageKey: 'default',
    hasChallenge: true,
    challengeContext: 'trap',
    actions: ['attempt'],
  },
  treasure: {
    type: 'treasure',
    title: 'Locked Treasure',
    bodyText: ['A sturdy chest sits half-buried in the rubble.', 'Answer correctly to force the lock.'],
    imageCategory: 'treasure',
    imageKey: 'locked',
    hasChallenge: true,
    challengeContext: 'treasure',
    actions: ['attempt'],
  },
  shrine: {
    type: 'shrine',
    title: 'Old Shrine',
    bodyText: ['A faint warmth radiates from a worn shrine.', 'Speak the word correctly to receive its blessing.'],
    imageCategory: 'treasure',
    imageKey: 'shrine',
    hasChallenge: true,
    challengeContext: 'shrine',
    actions: ['attempt'],
  },
  rest: {
    type: 'rest',
    title: 'Resting Point',
    bodyText: ['A safe alcove, quiet and dry.', 'You take a moment to catch your breath.'],
    imageCategory: 'treasure',
    imageKey: 'rest',
    hasChallenge: false,
    challengeContext: 'event',
    actions: ['proceed'],
  },
  discovery: {
    type: 'discovery',
    title: 'Curious Discovery',
    bodyText: ['Something glints among the stones.', 'Answer correctly to claim it.'],
    imageCategory: 'events',
    imageKey: 'discovery',
    hasChallenge: true,
    challengeContext: 'event',
    actions: ['attempt'],
  },
  monster: {
    type: 'monster',
    title: 'Monster Encounter!',
    bodyText: ['A hostile creature blocks your path!', 'Prepare for battle.'],
    imageCategory: 'enemies',
    imageKey: 'default',
    hasChallenge: false,
    challengeContext: 'event',
    actions: ['attempt'],
  },
  special: {
    type: 'special',
    title: 'Strange Occurrence',
    bodyText: ['The air shimmers with an unfamiliar energy.', 'Something unusual is happening here.'],
    imageCategory: 'events',
    imageKey: 'special',
    hasChallenge: true,
    challengeContext: 'special',
    actions: ['attempt'],
  },
}

export const bossRoomDefinition: EventDefinition = {
  type: 'special',
  title: 'Boss Room Discovered',
  bodyText: [
    'Every word in this dungeon has been challenged.',
    'A massive sealed door has opened somewhere ahead.',
    'You may enter and face the boss now, or keep exploring first.',
  ],
  imageCategory: 'events',
  imageKey: 'bossroom',
  hasChallenge: false,
  challengeContext: 'event',
  actions: ['enter_boss', 'proceed'],
}
