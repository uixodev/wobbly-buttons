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
