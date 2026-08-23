# Thoth

A lightweight, offline, portrait-mobile dungeon-crawling language-study RPG prototype, built for the
iPhone 14 Pro Max viewport (~430×932 CSS px) and responsive down to smaller phones.

Create vocabulary **Spells** → group them into **Spell Sets** → equip a set to your **Totem** →
configure a **Dungeon** → explore a visual-novel-style sequence of random events → answer vocabulary
challenges and fight turn-based battles → unlock and break the **Boss Plateau** → defeat the boss →
review your **Results** and long-term **Records**.

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
  config/       Balance formulas & tunable constants (balance.ts), local asset
                registry with placeholder fallback (assets.ts) — no numeric
                constant lives inside a component or system.
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
                  dungeonSession.ts — event flow, rewards, boss-unlock,
                    run-stats accumulation.
                  battleEngine.ts — turn-based attack/defense state machine.
                  bossPlateau.ts — Plateau requirement tracking.
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
    screens/    MainMenu, Compendium, Totem, Dungeon (config/explore/battle/
                results), Records.
    styles/     Single global stylesheet (dark theme, system fonts only —
                no network font loads).
scripts/
  gen-placeholders.mjs   Generates every placeholder PNG under public/assets
                         (no external deps — hand-rolled PNG encoder). Runs
                         automatically via `npm install`'s postinstall hook,
                         or manually with `npm run gen:assets`.
public/assets/           Local placeholder art (generated, gitignored — see
                         above), one folder per replaceable slot: locations,
                         events, traps, treasure, totems, enemies, bosses,
                         battlebg, spells. Drop in real PNGs with matching
                         filenames to reskin — no code changes needed.
```

## Notes on scope

- Vocabulary is never semantically validated — a Spell's Korean/English text is only checked against
  the player's own saved answer(s) (trim + English case-insensitive). No AI, dictionary, or
  translation API is used anywhere.
- Only the 10-Word Dungeon tier is exercised end-to-end in this prototype; 25/50-word tiers reuse the
  same systems with a higher `wordLimit` in `config/balance.ts`.
- Dungeon runs are transient (in-memory) by design; Spell/Totem/Set progression and Records persist
  across reloads via `localStorage`.
