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
| **03 / Blog** | "Explore my blog": four illustrated covers (`assets/blog-*.webp`) for the articles (AI, process, pricing, domains) with a little chat with Viraa beside them. Titles are in `index.html` (`.blog-cap`); link each tile to its real article. |
| **04 / Let's work together** | "Have a *project* in mind?" + `Get in touch` (a `mailto:` link) |
| **Footer** | One black band with a liquid wavy top edge, holding the brand, navigation, services, social links, the newsletter form, the copyright line and "Back to top" (all in cream) |

## Files

- `site.css` — layout, type and the illustrated stand-ins. Fonts are self-hosted in `fonts/` (Instrument Serif, Newsreader, JetBrains Mono, Reenie Beanie).
- `site.js` — scroll reveals, hand-drawn lines that draw themselves, the newsletter form (validates, but is **not connected to a service yet**).
- `footer.js` — the black footer band's wavy top edge is liquid: it drifts on its own, bulges toward your cursor and ripples when you click near it. Tunables in `CONFIG` at the top.
- `vira-logo.js` / `.css` — the interactive logo and character (eyes follow the cursor, soft-body outline, hand-drawn wordmark; `data-mark-only` shows just the character; `--eye` themes its eyes).
- `wobbly-buttons.js` / `.css` — the imperfect, spring-driven buttons (`<a class="wobbly" data-variant="solid|outline">`).
- `ink-cursor.js` / `.css` — the ink-droplet cursor (fine pointers only).
- `nav.css` + `nav.js` — the navigation. The logo sits top left and a hand-drawn burger capsule (burger · "Menu") sits top right on every screen size — it is the only navigation. The capsule opens a full-screen menu: a black liquid curtain pours down with a wavy edge (like the footer's), huge serif links rise in one after another (hover one: it turns italic and the others dim), the capsule turns cream and its burger becomes a cross. Esc, the cross or choosing a link closes it; focus is trapped inside while it's open and returned to the burger afterwards. On phones the capsule is always shown. Timings and wave in `CONFIG` at the top of `nav.js`; reduced motion removes the animation.
- `archive/hero-experiments/` — the earlier "websites that feel alive." hero (living Orchid shape, purple heat-map background, sound, doodles, ink flower). Not loaded.

## Replacing the stand-in images

Every blob image (`.blob`) is an illustration built in CSS, clipped to an organic SVG shape (the `<clipPath>`s at the top of `index.html`).
To use a real photo or screenshot, add an `<img src="…" alt="…">` as the **first child** of that `<figure>`: it fills the shape and covers the illustration.

## Things to fill in

- `dearviraa@gmail.com` (the email links). The social links are listed in `contact.js` and in the footer in `index.html`.
- Hook the newsletter form up to a mailing service (the handler is in `site.js`).
- "View all projects" and the project cards link to `#work` until the project pages exist.
- The footer says © 2024 (from the wireframe).

- `services.js` — the Services panels: hover one and translucent objects float up inside it and drift with your cursor (design: glass cards, type, a pen curve; development: code chips and a terminal; creative extras: a field of + marks that turn toward the cursor), and the cursor becomes the panel icon.
- `click-sparks.js` — click anywhere and a few short hand-drawn lines flick out from the point (like the marks round a pressed button; cream on dark surfaces). Mouse only: skipped on buttons, on touch screens and with reduced motion.
- `assets/work-mariia.webp`, `assets/work-oksana.webp` — the Mariia Sugaring Bristol project cover: three phone screenshots (home, price list, before & after) composed on the sand backdrop. Replace it the same way for other projects (a 1400×1148 image dropped into the card's `<figure class="blob">` as an `<img>`).
- `hero.js` + the `#hero-cat` SVG — the hero art: your cat-at-the-desk drawing, traced to vector and animated (tail bends, notes sway, plant breathes, steam rises, blink, eyes follow the cursor; click/tap = meow). The Contact section has a second traced cat (thinking, with a fish website in its bubble): tail bends, eyes follow, bubble dots pop, fish wags.
- `ink.js` — Featured projects as folders scattered at random spots (no gravity; draggable, thrown ones slide and stop) — originally floating logos (`assets/logo-mariia.webp`, `assets/logo-oksana.webp`, `assets/logo-master.webp`): Mariia's monogram floats and rocks, Oksana's lettering drifts and rests somewhere different each visit; drag them and they spring and settle where you leave them; click one and an irregular ink-shaped mask grows out of it (in the room available around it) to reveal the project; closing shrinks it back into its logo. The old project cards stay as the no-JS / reduced-motion fallback and data source.
- `mobile.js` — Featured projects on phones: folders scattered at random (positions fixed once per visit); tap one to open a scrolling feed where the screenshots glide in one after another, with two hand-drawn circles top-right (cross to close, arrow to open the live site). Desktop keeps the floating folders from `ink.js`.
- `chat.js` + `api/*` — (developer tools: type `/clear` in the chat to wipe this browser's chat data and cached site files, `/update` to refresh the cached files, `/help` to list them; they are never sent to WhatsApp. Your own details for the quick answers are in the `INFO` block at the top of `chat.js`.) the two-way chat with Viraa. Visitors leave a message (text, name, how to reply); `api/send-message.js` forwards it to your WhatsApp (WhatsApp Business Cloud API), `api/whatsapp-webhook.js` receives your WhatsApp replies and `api/messages.js` serves them back to the chat. Conversations are stored in a free Upstash Redis database (Vercel → Storage) for 30 days. Settings are listed at the top of each function file; `package.json` marks the functions as ES modules.
- `api/status.js` — open `/api/status` in a browser to see which chat settings exist (yes/no only) and what the WhatsApp webhook last did.
- `blog-ai.html`, `blog-process.html`, `blog-pricing.html`, `blog-domains.html` + `post.css` — one page per blog post (cover, tag, text). The tiles in the home page blog section link to them. To edit a post, change the text inside `.post-body` in its file.
- `contact.js` + `contact.css` — the "Get in touch" pop-up (any element with `data-contact` opens it). Edit the `LINKS` list at the top of `contact.js` to change the email or social links; the footer icons are in `index.html`.
- Newsletter: the footer form (`.news` in `index.html`, script in `site.js`) subscribes people through Buttondown (`https://buttondown.com/api/emails/embed-subscribe/uixo`). The privacy page has a matching section.
- `privacy.html` — the public privacy page (what the chat collects, how it travels via WhatsApp, Upstash/Vercel, 30-day retention, how to ask for access or deletion by email). Linked from the footer and the chat. If you change what the chat stores or for how long, update this page too.
