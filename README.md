# Viraa — website

A single-page site for Viraa (web design & creative coding, Bristol), built from the wireframes: warm ivory page (`#F7F3EF`), near-black ink (`#111`), beige-brown accent (`#B58B66`).
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
| **Footer** | One black band with a liquid wavy top edge, holding the brand, navigation, services, social links, the newsletter form, the copyright line and "Back to top" (all in cream) |

## Files

- `site.css` — layout, type and the illustrated stand-ins. Fonts are self-hosted in `fonts/` (Instrument Serif, Newsreader, JetBrains Mono, Reenie Beanie).
- `site.js` — scroll reveals, hand-drawn lines that draw themselves, the newsletter form (validates, but is **not connected to a service yet**).
- `footer.js` — the black footer band's wavy top edge is liquid: it drifts on its own, bulges toward your cursor and ripples when you click near it. Tunables in `CONFIG` at the top.
- `playground.js` — the experiments. Each loop only runs while its tile is on screen; with `prefers-reduced-motion` everything is drawn once, still.
- `vira-logo.js` / `.css` — the interactive logo and character (eyes follow the cursor, soft-body outline, hand-drawn wordmark; `data-mark-only` shows just the character; `--eye` themes its eyes).
- `wobbly-buttons.js` / `.css` — the imperfect, spring-driven buttons (`<a class="wobbly" data-variant="solid|outline">`).
- `ink-cursor.js` / `.css` — the ink-droplet cursor (fine pointers only).
- `nav.css` + `nav.js` — the navigation. The logo sits top left and a hand-drawn burger capsule (burger · "Menu") sits top right on every screen size — it is the only navigation. The capsule opens a full-screen menu: a black liquid curtain pours down with a wavy edge (like the footer's), huge serif links rise in one after another (hover one: it turns italic and the others dim), the capsule turns cream and its burger becomes a cross. Esc, the cross or choosing a link closes it; focus is trapped inside while it's open and returned to the burger afterwards. On phones the capsule is always shown. Timings and wave in `CONFIG` at the top of `nav.js`; reduced motion removes the animation.
- `archive/hero-experiments/` — the earlier "websites that feel alive." hero (living Orchid shape, purple heat-map background, sound, doodles, ink flower). Not loaded.

## Replacing the stand-in images

Every blob image (`.blob`) is an illustration built in CSS, clipped to an organic SVG shape (the `<clipPath>`s at the top of `index.html`).
To use a real photo or screenshot, add an `<img src="…" alt="…">` as the **first child** of that `<figure>`: it fills the shape and covers the illustration.

## Things to fill in

- `hello@viraa.me` (the email links) and the Instagram / GitHub / Pinterest links (`href="#"`).
- Hook the newsletter form up to a mailing service (the handler is in `site.js`).
- "View all projects" and the project cards link to `#work` until the project pages exist.
- The footer says © 2024 (from the wireframe).

- `services.js` — the Services panels: hover one and translucent objects float up inside it and drift with your cursor (design: glass cards, type, a pen curve; development: code chips and a terminal; creative extras: a field of + marks that turn toward the cursor), and the cursor becomes the panel icon.
- `click-sparks.js` — click anywhere and a few short hand-drawn lines flick out from the point (like the marks round a pressed button; cream on dark surfaces). Mouse only: skipped on buttons, on touch screens and with reduced motion.
- `assets/work-mariia.jpg`, `assets/work-oksana.jpg` — the Mariia Sugaring Bristol project cover: three phone screenshots (home, price list, before & after) composed on the sand backdrop. Replace it the same way for other projects (a 1400×1148 image dropped into the card's `<figure class="blob">` as an `<img>`).
- `hero.js` — the hero art: a still life of six hand-cut shapes (black solids and fine outlines) on springs. They drift, step aside as your cursor passes, and a click / tap / Enter re-arranges them into the next of three compositions. Static with reduced motion.
