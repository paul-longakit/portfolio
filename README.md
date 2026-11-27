# Paul Longakit — Portfolio

A single-page static portfolio. To preview it locally, run `python3 -m http.server 8000 --bind 127.0.0.1` from this directory and open <http://127.0.0.1:8000/>.

Edit `index.html` for content, `styles.css` for styling, and `animations.js` for motion. There is no build step. Anime.js 3.2.2 is vendored from the `animejs` npm package in `vendor/animejs/`, with its MIT license. The preview does not need internet access to animate. If JavaScript is unavailable or the visitor prefers reduced motion, the page remains usable without animations.

The mushroom crew builds each `data-build-scene` once as it enters view. Mark text with `data-build`, panels with `data-build="frame"`, and featured figures with `data-build="stamp"`. Text appears one letter at a time; meanwhile the original markup keeps its space and accessible names. **Skip animation** reveals the full page and stops future scenes until reload.

With the local server running, use `node tests/mushroom-reveal.browser.mjs` to check the reveal sequence, mobile layout, and motion fallbacks. The check needs Node.js with built-in `WebSocket` (22+) and Chrome (`CHROME_BIN` overrides `google-chrome`).

Project-local Delta skills: `/portfolio-design` for layout and case studies, and `/portfolio-motion` for Anime.js choreography and motion checks.

The project also includes two [Superpowers](https://github.com/obra/superpowers) skills from [v7.0.2](https://github.com/obra/superpowers/tree/22f0b463e7a5e579904dd6211a520321035526f7): `/writing-plans` and `/verification-before-completion`. These are project-local skill files, not a global plugin or a website dependency.

Design and verification checklist: [Mushroom Build Reveal implementation plan](docs/superpowers/plans/2026-11-28-mushroom-build-reveal.md).
