# wobbly-buttons

Soft-body "wobbly" buttons with five interaction states: **default → hover → cursor close → click (press) → release**.
Vanilla JS + CSS, no dependencies, no build step.

```html
<link rel="stylesheet" href="wobbly-buttons.css" />
<a href="#" class="wobbly" data-variant="solid">View my work →</a>
<a href="#" class="wobbly" data-variant="outline">Let’s talk →</a>
<script type="module" src="wobbly-buttons.js"></script>
```

- The outline is an SVG path whose points are driven by springs, so the blob stretches toward the cursor as it approaches, swells on hover, squishes on press and rebounds on release.
- Hand-drawn spark marks appear per state (arcs on hover/close, ticks on press/release).
- Theme with `--wb-color`, `--wb-text`, `--wb-stroke`. Respects `prefers-reduced-motion`. Works with touch and keyboard.
- Call `init(element)` (exported from `wobbly-buttons.js`) after injecting buttons dynamically.

Run: `npx serve .` (or any static server) and open `index.html`.

## Interactive logo

```html
<link rel="stylesheet" href="vira-logo.css" />
<a href="#" class="vira-logo" data-text="vira"></a>
<script type="module" src="vira-logo.js"></script>
```

The A-mark is a soft-body blob with an imperfect, gently wobbling outline (like the buttons); its eyes track the cursor, the body leans and bulges toward it, the dot floats away when you hover, hovering a letter of the wordmark makes it hop up (neighbours barely follow), a press squishes it and release makes it hop, and it blinks on its own. Size with `font-size`, colour with `color`.

## Ink-droplet cursor

```html
<link rel="stylesheet" href="ink-cursor.css" />
<script type="module" src="ink-cursor.js"></script>
```

A living ink droplet replaces the native cursor: it lags the pointer on a spring, wobbles, stretches into a teardrop along its direction of travel, swells over links/buttons, squishes on press, and leaves a thin trail that fades in about half a second. It is dark ink by default and eases to cream over the logo (`DARK_SURFACE`). Only activates for fine pointers (mouse/pen), so touch devices keep their normal behaviour; with `prefers-reduced-motion` it is a plain droplet with no trail. Tune `R`, `TRAIL_MS` and the spring constants at the top of `ink-cursor.js`.

## Colours

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#F7F3EF` | page background (cream) |
| `--ink` | `#111` | buttons, logo, text |
| `--accent` | `#AD86CF` (Orchid) | logo dot, hover/press fill of the solid button, logo focus ring |

## Navigation bar

`nav.css` + the `<header class="site-nav">` markup in `index.html`: logo on the left, mono uppercase links centred (hover lifts + turns Orchid), `[ BRISTOL, UK ]` and a softly breathing ink dot on the right. Collapses to logo + links on phones.

## Hero — "websites that feel alive."

`hero.css`, `hero-ink.js` and the `<section class="hero">` in `index.html`. Everything is centred on warm ivory.

- **Headline:** real, selectable HTML text in Fraunces (self-hosted variable font in `fonts/`, SOFT + WONK axes for soft, slightly imperfect letterforms). Letters hop and lean away from the cursor (off for touch and `prefers-reduced-motion`; the `<h1>` keeps a plain-text `aria-label`).
- **"alive." is a button.** It sits on a flat Orchid shape drawn by `alive-blob.js`: an outline of ~24 spring-driven points that drift slowly, stretch towards the cursor locally and spring back with a wobble (knobs in `ALIVE_CONFIG`).
- **Press "alive."** and a short choreography plays, then everything returns to normal (settings in the `PRESS` block at the top of `hero-ink.js`): `hero-gradient.js` floods a flowing purple heat-map from the word across the WHOLE website (a fixed full-window WebGL canvas behind everything, nav included); it holds a moment (the cursor stirs the background colour); then it flows back in towards "alive.". The headline stays plain black throughout. Press again while it plays to make it recede early. The page uses no GPU while idle. No WebGL: nothing visible changes; reduced motion: instant, still. Gradient knobs: `GRADIENT_CONFIG` (`paleness`, `flowSpeed`, `warp`, `bands`…).
- **Sound** (`alive-sound.js`, synthesised with the Web Audio API, no audio files; starts on the first press, so browsers allow it): deep and vibrating. A low thud on press; while the purple spreads a sub-bass drone swells in and climbs in pitch as its filter opens, two slightly mistuned saws beat against each other, a slow heartbeat pulse breathes through it and a fast tremble speeds up; as it recedes the pitch sinks, the filter closes, the tremble slows, and one last deep thud settles the page. Pitch, depth, pulse and tremble rates, and levels are in `SOUND_CONFIG`. A small "Sound: on/off" switch in the nav mutes it (remembered in `localStorage`, also on phones).
- **The character** beside "alive." is the logo mark (`<span class="vira-logo" data-mark-only>`): its eyes follow the cursor and it hops when you press "alive.".
- Kept from the brand: ivory `#F7F3EF`, ink `#111`, Orchid `#AD86CF`, the logo, nav, wobbly buttons and ink cursor.

## Living ink flower

`ink-flower/index.html` (standalone preview) + `ink-flower/ink-flower.js`: a flower of soft, elastic black ink in plain Canvas 2D (no dependencies). Run any static server in the repo root and open `/ink-flower/`. All the knobs live in the labelled `CONFIG` block at the top of `ink-flower.js` (petal count/length/width, asymmetry, idle movement, cursor radius and push/pull strength, spring strength, damping, colours); tweak live from the console with `flower.set({ ... })`.
