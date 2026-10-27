# Viraa — website

A single-page site for Viraa (web design & creative coding, Bristol), built from the wireframes: warm ivory page (`#F7F3EF`), near-black ink (`#111`), Orchid accent (`#AD86CF`).
Plain HTML, CSS and ES modules: no framework, no build step, no dependencies. Serve the folder with any static server and open `index.html`
(modules and fonts need `http://`, not `file://`), e.g. `python3 -m http.server`.

## Sections (`index.html`)

| | |
| --- | --- |
| **Hero** | "Thoughtful websites for people with *beautiful ideas.*", intro, `View my work` / `Let's talk`, a blob-shaped mockup with the interactive character, a black dot and handwritten notes |
| **01 / Featured projects** | Three projects with organic blob images (Mariia Sugaring Bristol, Oksana Nails, The Daily Bloom) |
| **02 / Services** | Web Design, Development, Creative Extras + a "More about services" blob |
| **03 / Playground** | Four live experiments: jelly text (the logo), an interactive flower canvas, a physics playground, liquid type |
| **04 / Let's work together** | "Have a *project* in mind?" + `Get in touch` (a `mailto:` link) |
| **Footer** | Brand, navigation, services, social links, newsletter form, and the playful black band (below) |

## Files

- `site.css` — layout, type and the illustrated stand-ins. Fonts are self-hosted in `fonts/` (Instrument Serif, Newsreader, JetBrains Mono, Reenie Beanie).
- `site.js` — scroll reveals, hand-drawn lines that draw themselves, the newsletter form (validates, but is **not connected to a service yet**).
- `footer.js` — the black footer band: a liquid wavy top edge that bulges toward your cursor and ripples when clicked, two plucked strings you can push around, a doodle pad (press and drag; the cream ink dissolves after a few seconds), the DESIGN / CODE / EXPERIMENT / REPEAT words lighting up in turn, and the character hopping on "Back to top". Tunables in `CONFIG` at the top.
- `playground.js` — the experiments. Each loop only runs while its tile is on screen; with `prefers-reduced-motion` everything is drawn once, still.
- `vira-logo.js` / `.css` — the interactive logo and character (eyes follow the cursor, soft-body outline, hand-drawn wordmark; `data-mark-only` shows just the character; `--eye` themes its eyes).
- `wobbly-buttons.js` / `.css` — the imperfect, spring-driven buttons (`<a class="wobbly" data-variant="solid|outline">`).
- `ink-cursor.js` / `.css` — the ink-droplet cursor (fine pointers only).
- `nav.css` — the navigation bar.
- `archive/hero-experiments/` — the earlier "websites that feel alive." hero (living Orchid shape, purple heat-map background, sound, doodles, ink flower). Not loaded.

## Replacing the stand-in images

Every blob image (`.blob`) is an illustration built in CSS, clipped to an organic SVG shape (the `<clipPath>`s at the top of `index.html`).
To use a real photo or screenshot, add an `<img src="…" alt="…">` as the **first child** of that `<figure>`: it fills the shape and covers the illustration.

## Things to fill in

- `hello@viraa.me` (the email links) and the Instagram / GitHub / Pinterest links (`href="#"`).
- Hook the newsletter form up to a mailing service (the handler is in `site.js`).
- "View all projects" and the project cards link to `#work` until the project pages exist.
- The footer says © 2024 (from the wireframe).
