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
