# Thoth

A lightweight, offline, portrait-mobile dungeon-crawling language-study RPG prototype, built for the
iPhone 14 Pro Max viewport (~430×932 CSS px) and responsive down to smaller phones.

Create vocabulary **Spellwords** → group them into **Spell Sets** → equip a set to your **Totem** →
configure a **Dungeon** → explore from a **Standby** hub, moving one turn at a time into weighted
random events (treasure, traps, magic rooms, rest areas, battles, direction forks) → answer
vocabulary prompts by assembling syllable tiles → find the **Boss Door** and the **Key** → break the
boss **Barrier** by using every word correctly → defeat the boss → review your **Results** and
long-term **Records**.

A run ends in exactly one of three ways: the boss falls, the Totem's HP hits 0 (costing one **Life
Point** — at zero the Totem is destroyed for good), or the player walks out.

No accounts, no network calls, no cloud sync — everything runs and saves locally in the browser.

## Running it

```bash
npm install
npm run dev       # local dev server
npm run build     # production build to dist/ (openable straight from disk — base: './')
npm run preview   # serve the production build locally
```

## Project structure

Gameplay logic is kept independent of presentation wherever practical:

```
src/
  config/       Balance formulas & tunable constants (balance.ts), dungeon
                event weights / Direction modifiers / per-event balance
                (dungeonEvents.ts), item catalog + drop rates (items.ts),
                local asset registry with placeholder fallback (assets.ts) —
                no numeric constant lives inside a component or system.
  domain/       Plain data types: Spell, SpellSet, Totem, DungeonConfig/Run,
                Challenge, Battle (deck/plateau/timer), Settings.
  systems/      Pure, UI-free logic modules:
                  spellFactory / spellProgression / spellCompendium — Spell
                    CRUD, leveling, charge, damage & reward formulas.
                  spellSetManager, totemManager — Set & Totem CRUD.
                  deck.ts — battle-deck ordering (Spell IDs only, no vocab).
                  answerChecker.ts — normalized answer comparison, no AI.
                  eventGenerator.ts — weighted random events, anti-repeat.
                  eventContent.ts — static per-event-type flavor/asset data.
                  challengeEngine.ts — prompt generation + grading.
                  dungeonState.ts — the dungeon state machine: which states
                    exist and which transitions are legal. The single
                    authority on what the player may do right now.
                  dungeonSession.ts — run orchestration: turns, events,
                    modifiers, key/door tracking, rewards, run stats.
                  directionModifiers.ts — temporary Direction weight biases
                    (add / tick / expire / apply, floored at 0).
                  wordStats.ts — per-run vocabulary tracking, separate from
                    a Spell's lifetime counters.
                  hangman.ts — the Magic Room syllable puzzle.
                  restArea.ts — rest healing, price curve, affordability.
                  runResults.ts — builds the end-of-run report (derives
                    only; grants nothing).
                  battleEngine.ts — turn-based attack/defense state machine,
                    multi-prompt enemy attacks, mimics, barrier access.
                  bossPlateau.ts — boss Barrier requirement tracking.
                  totemManager.ts — Totem CRUD, HP, and Life Points.
                  records.ts — Records screen sort/filter selectors.
                  persistence.ts — storage abstraction (swap the adapter to
                    change where saves live) + versioned save/load.
  state/        Zustand stores that call into systems/ and hold state:
                  persistentStore.ts — Compendium, Sets, Totems, Settings
                    (autosaved to localStorage via systems/persistence.ts).
                  dungeonStore.ts — transient dungeon run + battle state.
                  uiStore.ts — top-level screen navigation.
  ui/
    components/ Shared presentational components (SpellCard, Bar, TypewriterText,
                TotemPanel, ProgressMeter, AssetImage, SlidePanel, TopBar).
    screens/    MainMenu, Compendium, Totem, Records, and Dungeon —
                DungeonScreen routes to config / ExploreView / BattleView /
                ResultsView; ExploreView in turn renders whichever event
                view the run's state calls for (StandbyActions,
                MagicRoomView, RestAreaView, EventActionViews).
    styles/     Single global stylesheet (dark theme, system fonts only —
                no network font loads).
scripts/
  gen-placeholders.mjs   Fills in any missing placeholder PNG under
                         public/assets (no external deps — hand-rolled PNG
                         encoder). Runs automatically via `npm install`'s
                         postinstall hook, or manually with `npm run
                         gen:assets`. Never overwrites a file that already
                         exists, so replacing a placeholder with real
                         artwork is permanent.
public/assets/           Local art, committed to the repo, one folder per
                         replaceable slot: locations, events, traps,
                         treasure, totems, enemies, bosses, battlebg,
                         spells. Drop a real PNG in with the matching
                         filename to replace a placeholder — no code
                         changes needed, and it won't be regenerated over.
```

## Notes on scope

- Vocabulary is never semantically validated — a Spell's Korean/English text is only checked against
  the player's own saved answer(s) (trim + English case-insensitive). No AI, dictionary, or
  translation API is used anywhere.
- Vocabulary answers are assembled from tiles rather than typed, so a correct recall can never be
  rejected for a typo and no keyboard ever opens mid-dungeon. The Magic Room's Hangman follows the
  same rule: guesses are tapped from a grid of candidate syllable blocks.
- Only the 10-Word Dungeon tier is exercised end-to-end in this prototype; 25/50-word tiers reuse the
  same systems with a higher `wordLimit` in `config/balance.ts`.
- Rewards are credited at the moment they are earned, during the run. The Results screen only
  *reports* — re-rendering or reopening it can never grant anything twice.
- Dungeon runs are transient (in-memory) by design; Spell/Totem/Set progression and Records persist
  across reloads via `localStorage`.
