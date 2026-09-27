# Shared card-table styling with StyleX

Poker and blackjack establish the visual reference: paper backgrounds, textured
navy or teal felt, red table rims, ink outlines, hard offset shadows, and Bebas
Neue headings. Their shared visual primitives now use StyleX. Go Fish consumes
those same components for its oval table, player seats, draw pile, hand, books,
and action controls.

This is an incremental migration. Game-specific positioning, labels, surrounding
room layouts, and existing keyframe animations still use Tailwind/global CSS.
The game protocols and rules are unchanged.

## Shared components

The components are exported from `src/components/casino`:

- `TableLayout`: fits the table and primary controls into the available dynamic
  viewport height. Through 18:9, controls sit below the full-width table. Above
  18:9 on desktop, controls sit in a right-hand column. Table geometry uses the
  available height and width instead of growing the page. Go Fish rank groups
  wrap into rows with room for raised cards and shadows; poker's log opens on demand.
- `TableSurface`: oval poker/Go Fish table or curved blackjack table, including
  felt texture, rim, and shadow. The surrounding container supplies `--u` for
  proportional sizing and positions any seats and table decorations.
- `TableNameplate`: player seat surface with active, winner, and muted states,
  plus poker and blackjack proportions.
- `TableCard` and `CardSlot`: shared card edges, highlight/dim states, deal and
  flip animations, and empty slots. Animated card lists use `For keyed={false}`.
- `PlayerAvatar`: shared circular avatar border and shadow.
- `TablePanel`: active or waiting action-panel surface.
- `TableButton`: named color tones and action, compact, or square sizes;
  disabled, pressed, and visible keyboard-focus states.

Go Fish keeps its game-specific rank grouping, opponent selection, and draw-pile
composition in its own components. Its responsive table places the local player
at the bottom. Only the local hand is face up; seats show public card counts and
completed books.

## Tokens and composition

`packages/www/src/styles/app.css` remains the palette, font, texture, and shadow
source. `src/styles/tokens.stylex.ts` exposes references to these CSS custom
properties through `stylex.defineConsts`, avoiding a second palette. The CSS
theme is marked `static` so Tailwind emits tokens referenced only by StyleX.

Use these tokens in `stylex.create` definitions next to the component. Compose
base and state styles through `stylex.attrs`, which supplies Solid's `class`
attribute and serialized inline styles. Keep reactive conditions inside JSX.
Shared components accept explicit visual variants; layout utilities can still
supply width and placement. Avoid defining the same property in both systems on
an element.

## Build integration

`stylex.config.ts` shares compiler options between Vite and the UI test project.
The StyleX plugin runs before Solid and resolves the existing `~/` alias. Vite's
HTML integration loads development CSS and hot updates; production builds
extract CSS into the emitted stylesheet.

UI tests use the Rollup adapter with the same compiler options. This avoids the
Vite adapter's browser CSS polling interval, whose cleanup expects an HTTP server
close event that the Vitest environment does not provide.

StyleX follows Tailwind's theme, base, components, and utilities layers. Its
internal priority layers are nested under `stylex`, preserving migrated styles
after production CSS optimization. Do not reserve an empty StyleX layer in
`app.css`: the CSS optimizer can reorder it before the plugin appends its rules.

## Validation

- `pnpm --filter www build` checks CSS extraction and TypeScript.
- `pnpm --filter www exec vitest run --project ui` runs the UI suite with the real
  StyleX compiler.
- Poker and blackjack seeded/live browser suites cover actions, settlement,
  Party displays and private cards, spectators, and reconnect recovery.
- The Go Fish browser suite checks computed styles, opponent/rank selection,
  clearing, keyboard focus, drawing, and propagation across three browsers. It
  also captures phone/desktop screenshots and checks mobile horizontal overflow.
- Local before/after screenshots of poker and blackjack verify preservation of
  the existing design. Production preview smoke checks verify extracted CSS,
  responsive layouts, and multiplayer sessions for all three games.

Go Fish Party display controls remain outside this styling migration.

## Room controls

Party layout selection and the Party display link live in the lobby. The choice
is retained in the room URL, including links opened from a display QR code.
Reconnect grace settings also live in the lobby. During play, the recovery panel
is a floating disclosure that only appears when someone is offline or this device
is reconnecting; it does not occupy space in the game layout.
