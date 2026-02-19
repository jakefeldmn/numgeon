# Numgeon — Project Conventions

## Overview
Browser-based roguelike deckbuilder (Slay the Spire + Balatro + D&D dice). Players roll dice, combine results with operator cards to build math expressions that hit a monster's HP target. 3-act structure with branching map, shops, events, rest sites, bosses, relics, and scoring combos.

## Tech
- Vanilla HTML/CSS/JS with ES modules (no build tools)
- Three.js + cannon-es via CDN import map for 3D dice rendering
- No npm, no bundler — serve with `python3 -m http.server 8080`
- All persistence via localStorage (save/load, stats, ascension progress)

## Code Style
- ES modules with named exports
- camelCase for variables/functions, PascalCase for classes/constructors
- Single responsibility per file
- All game randomness flows through seeded RNG (`js/utils/random.js`)
- No `eval()` — expression parsing uses shunting-yard algorithm
- State mutations go through GameState; UI reads state and re-renders

## File Organization
- `js/data/` — Pure data definitions (dice, operators, monsters, relics, conditions, events, rewards). No logic, no state imports.
- `js/systems/` — Game logic (combat, expression parsing, map gen, scoring, relics, shop). No DOM access.
- `js/ui/` — DOM manipulation and rendering. Reads state, produces HTML.
- `js/utils/` — Pure utility functions (math, RNG, event bus, audio).
- `js/state/` — Game state management, save/load, run stats, ascension, meta-progression.
- `js/rendering/` — Three.js 3D dice renderer and physics.
- `css/` — One CSS file per screen/component (style.css, combat.css, cards.css, map.css, screens.css).

## Key Patterns
- Event bus (`js/utils/eventBus.js`) for decoupled communication between systems and UI
- Systems never import UI; UI imports systems
- Data files export plain objects/arrays, never classes
- Ascension level passed as parameter to data functions (they don't import state)
- Relic hook system: relics register effects on game events (onRoll, onEvaluate, onTakeDamage, etc.)
- Operators sorted by PEMDAS group then rarity in UI displays
- Per-act color theming via CSS custom property overrides (`setActTheme(act)` in main.js)
- Screen transitions: sequential fade out → pause → fade in, with `transitioning` guard flag
- Interactive events use `customRender(container, rng, state, onResult)` — state is passed as parameter since data files don't import GameState
- Per-run stats tracked in `state.run.stats`, separate from lifetime `RunStats` in localStorage

## Game Structure
- **3 Acts**, each with a branching map (DAG), unique monster tiers, and a boss
- **Bosses**: Prime Minister (Act 1, prime results only), Palindromer (Act 2, palindrome results only), The Infinity (Act 3, perfect square results only)
- **6 Loadouts**: Standard, Naturalist, Architect, Chaos, Minimalist, Gambler (last 4 locked behind milestones)
- **4 Dice classes**: Standard, Fibonacci, Square, Prime
- **Operators**: +, -, ×, ÷, ^, √, %, !, (), concat (exotic), log, negate, triangle, rectangle
- **Rarity tiers**: common, uncommon, rare, legendary, exotic
- **10 Ascension levels** with stacking difficulty modifiers
- **Meta-progression**: Loadout unlocks derived from lifetime RunStats milestones
- **Scoring combos**: Prime Time, Palindrome, Fibonacci, Perfect Square, All Dice, No Operators, The Answer (42), Century (100)
- **32 Events**: gambling, equipment, cursed, NPC, environmental, meta/power, and interactive categories
- **3 Act Themes**: Dungeon (blue-purple), Inferno (warm reds), Void (deep cosmic purples)

## Important Implementation Details
- Combat conditions system (`js/data/conditions.js`): monsters get 0-3 random conditions that modify rules
- `calculateDamage()` accepts ascension parameter for near-miss threshold
- `createMonsterInstance()` accepts ascension for HP/attack scaling
- `generateShopStock()` accepts ascension for price gouging
- Save/load auto-triggers after each map node completion
- Give up button in HUD ends run early with confirmation dialog
- Map canvas colors read from CSS variables (cached per `renderMap()` call) for act theming
- `showScreen(name, options)` handles all screen transitions; `{ dramatic: true }` adds combat entry animation
- Run summary (`showRunSummary(isWin)`) unifies victory and defeat screens with stats + build display
- Combat defeat emits `combatDefeat` (not `requestNewRun`) so `recordLoss()` fires before summary
- `incrementRunStat(key, amount)` and `setRunStatMax(key, value)` track per-run combat stats
- Synth audio via Web Audio API (`js/utils/audio.js`) — no audio files needed
