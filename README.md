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

`hero.css`, `hero-ink.js` and the `<section class="hero">` in `index.html`.

- **Headline:** real, selectable HTML text in Fraunces (self-hosted variable font in `fonts/`, set to its SOFT + WONK axes for soft, slightly imperfect letterforms). "alive." rests on a living Orchid shape: `alive-blob.js` draws it as an outline of ~24 spring-driven points that drift slowly and never exactly repeat, stretch towards the cursor locally, and spring back with a wobble. The fill is a WebGL shader: a warped, flowing noise field mapped through a purple heat-map palette (deep orchid → lilac → pale) with thin contour lines and tiny flecks; it "ignites" (warps harder, ripples from the cursor, runs hotter) when the cursor approaches and once on load, then settles. Flat Orchid if WebGL is unavailable. All knobs live in the labelled `ALIVE_CONFIG` at the top of that file. Each letter is a small spring: letters hop and lean away from the cursor (off for touch and `prefers-reduced-motion`; the `<h1>` keeps a plain-text `aria-label`).
- **Artwork:** the living ink flower (`ink-flower/ink-flower.js`) grows on the right on wide screens. On phones and portrait tablets the layout stacks and the flower floats in the free band above the headline, sized from the available height so it never lands behind the type. Sizes and positions live in `layoutFor()` in `hero-ink.js`.
- Kept from the brand: ivory `#F7F3EF`, ink `#111`, Orchid `#AD86CF`, the logo, nav, wobbly buttons and ink cursor.

## Living ink flower

`ink-flower/index.html` (standalone preview) + `ink-flower/ink-flower.js`: a flower of soft, elastic black ink in plain Canvas 2D (no dependencies). Run any static server in the repo root and open `/ink-flower/`. All the knobs live in the labelled `CONFIG` block at the top of `ink-flower.js` (petal count/length/width, asymmetry, idle movement, cursor radius and push/pull strength, spring strength, damping, colours); tweak live from the console with `flower.set({ ... })`.
