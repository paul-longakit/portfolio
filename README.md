# Paul Longakit — Portfolio

A single-page static portfolio. To preview it locally, run `python3 -m http.server 8000 --bind 127.0.0.1` from this directory and open <http://127.0.0.1:8000/>.

Edit `index.html` for content, `styles.css` for styling, and `animations.js` for motion. There is no build step. Anime.js 3.2.2 is vendored from the `animejs` npm package in `vendor/animejs/`, with its MIT license. The preview does not need internet access to animate. If JavaScript is unavailable or the visitor prefers reduced motion, the page remains usable without animations.

The mushroom crew builds each `data-build-scene` once as it enters view. Mark text with `data-build`, panels with `data-build="frame"`, and featured figures with `data-build="stamp"`. Text appears one letter at a time; meanwhile the original markup keeps its space and accessible names. **Skip animation** reveals the full page and stops future scenes until reload.

With the local server running, use `node tests/mushroom-reveal.browser.mjs` to check the reveal sequence, mobile layout, and motion fallbacks. The check needs Node.js with built-in `WebSocket` (22+) and Chrome (`CHROME_BIN` overrides `google-chrome`).

The **msh dev live builder** is a separate showcase. Edit the demo title, biome labels, and inline SVGs in `index.html`, and style the editor and move its slots in `live-builder.css`. The cursor measures the real pill, slots, and title card automatically. In `live-builder.js`, edit `timing` for the beats and `points` for the free start, drag-arc, and resting positions. The eight-second loop uses the browser’s Web Animations API and shows a completed static scene when motion is unavailable or reduced.

Design and verification checklist for the showcase: [Live Builder Polish](docs/superpowers/plans/2026-11-28-live-builder-polish.md).

Project-local Delta skills: `/portfolio-design` for layout and case studies, and `/portfolio-motion` for Anime.js choreography and motion checks.

The project also includes two [Superpowers](https://github.com/obra/superpowers) skills from [v7.0.2](https://github.com/obra/superpowers/tree/22f0b463e7a5e579904dd6211a520321035526f7): `/writing-plans` and `/verification-before-completion`. These are project-local skill files, not a global plugin or a website dependency.

Three [iArt Motion Skills](https://github.com/iart-ai/motion-skills) are also available locally: `/kinetic-typography` from the [typography pack](https://github.com/iart-ai/kinetic-typography-skills/tree/2b79c81230c6647a344844f9ed53b6fa07f3f1f9), and `/60fps-animation` and `/accessible-animation` from the [web pack](https://github.com/iart-ai/web-animation-skills/tree/ed3a045192679b24d32090ee7a983871311ababd). Use their timing, rendering, and accessibility guidance with the existing Anime.js implementation.

LottieFiles’ project-local [`/motion-design` skill](https://github.com/LottieFiles/motion-design-skill/tree/d77a9fc8cb371cab1ba5420df5bfd232cd14c9bb) guides the live builder’s choreography: cursor anticipation, press feedback, sprite overshoot, and a quiet hold before reset. It does not add a Lottie player or render service.

Design and verification checklist: [Mushroom Build Reveal implementation plan](docs/superpowers/plans/2026-11-28-mushroom-build-reveal.md).
