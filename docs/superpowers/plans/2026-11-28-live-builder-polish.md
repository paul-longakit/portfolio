# msh dev Live Builder Polish Implementation Plan

> Execute in the current worktree, one task at a time. Use `/motion-design` to review each beat and `/verification-before-completion` before reporting the result.

**Goal:** Make the live builder read as a cozy game-editing session on mobile and desktop, and make changing the game title or layout safe without retuning the cursor by hand.

**Architecture:** Keep the static HTML and inline artwork in `index.html`, the responsive editor layout in `live-builder.css`, and native Web Animations in `live-builder.js`. Use the real editor elements as anchors for cursor and sprite motion, and use one playback position when rebuilding after a resize. The portfolio’s existing Anime.js page reveal remains separate.

**Tech stack:** Static HTML, CSS, inline SVG, Web Animations API, IntersectionObserver, ResizeObserver, and the existing Chrome DevTools browser test.

## Current review

- **Keep:** The eight-second loop has a clear sequence: toggle, drag, type, hold. Chrome assertions already cover drag alignment at one sampled frame, pause/resume, reset, and a completed reduced-motion scene.
- **Confirmed layout issue:** Seeking to the finished scene in Chrome, the default project card crossed the clipping boundary by **1 px at 320 px**. Substituting `Mushroom Mechanics: A Woodland Inventory Prototype` crossed the boundary by **28 px at 320 px, 4 px at 390 px, and 6 px at 768 px**. The current layout anchors the card near the bottom but doesn't reserve room for wrapped copy.
- **Maintenance risk:** Cursor destinations in `points` duplicate the layout in CSS. The current biome stop was horizontally inside the pill at all four tested widths; that is not a guarantee after changing labels or layout. The existing drag assertion also compares transforms, not pointer-tip and target positions.
- **Choreography gap:** The target is already highlighted before the sprite arrives. Giving hover, pickup, snap, and title completion distinct reactions will make it clearer that the cursor caused each change. The stepped title mask reveals equal widths, not actual characters, which can show partial letters or reveal wrapped lines in parallel.

## Constraints and acceptance checks

- Keep the showcase below the hero, no new runtime dependency, and no external rendering or asset service.
- Keep the loop close to **8 seconds** and the finished title visible for **at least 1.5 seconds**. Preserve the current deliberate pace; polish feedback rather than adding more concurrent motion.
- The completed scene must fit with at least **8 CSS px** below the project card at 320, 390, 768, and 1200 px with the default title and the alternate title above.
- Off-screen, background-tab, manual pause, and reduced-motion states must not get overridden by a resize. With reduced motion or JS disabled, show the complete scene without the demo control.

## Task 1: Reserve space for real project titles

**Files:** `index.html`, `live-builder.css`, `tests/mushroom-reveal.browser.mjs`.

- [ ] Add a failing Chrome check for the completed card at 320, 390, 768, and 1200 px, using both sample titles. Assert the project card is inside the canvas with at least 8 px bottom clearance and that its text doesn't overflow horizontally.
- [ ] Give the project card a dedicated bottom row in the editor instead of anchoring it at `top: 76%`. Keep the stage above it responsive and reserve the title’s full wrapped height before starting playback. Use the same title layout in the animated and static paths.
- [ ] Re-run the browser suite; both titles should fit without a layout jump when the type reveal completes.

## Task 2: Connect the cursor and sprite to the editor geometry

**Files:** `index.html`, `live-builder.css`, `live-builder.js`, `tests/mushroom-reveal.browser.mjs`.

- [ ] Add frame assertions at arrival and drop: the cursor hotspot is inside the Spore Glow pill at the click, the sprite stays attached to its grab point during the drag, and the sprite center is within **2 CSS px** of the target center after the bounce. Check at a mobile and desktop width and again after resizing while paused.
- [ ] Add `measureAnchors(viewport)` in `live-builder.js` to read the pill center, source/target slot centers, and title inset together, relative to the viewport. Keep the intermediate drag arc and start/rest positions in `points`. Build sprite and pointer tracks from the same measured anchors; account for the pointer SVG tip’s offset.
- [ ] Rebuild measured tracks on viewport size changes with `ResizeObserver`, preserving the current cycle phase and playing/paused state. Batch geometry reads before rebuilding. Do not measure geometry on every frame or allocate tracks for the reduced-motion state.
- [ ] Re-run the suite and confirm the paused cycle stays paused after resize and resumes from the same phase.

## Task 3: Make each action visibly cause the next one

**Files:** `index.html`, `live-builder.css`, `live-builder.js`, `tests/mushroom-reveal.browser.mjs`, `README.md`.

- [ ] Add deterministic checks just before the biome press, while dragging, after the snap, during typing, at the finished hold, and after reset. Assert inactive glow before press, a target reaction after release, a strict prefix during typing, and a full title and restored source sprite on their respective beats.
- [ ] Keep the cursor as the primary motion. Give the pill a short press, dim the target at rest and show a brief outline at landing, then start the spores after the title completes. Use transform/opacity for these beats; keep the completed view mostly still until reset.
- [ ] Replace the width-based title mask with a grapheme-based reveal that preserves layout and wraps in reading order. Keep the real title once in markup, use an `aria-hidden` visual layer, and use a stepped native animation per grapheme (or an equivalent discrete reveal without a per-frame JS loop). Show the original text when playback is unavailable.
- [ ] Run `node tests/mushroom-reveal.browser.mjs`, `node --check live-builder.js`, and `git diff --check`. Inspect start, drag, and finished frames on desktop and 320px, plus the reduced-motion frame. Document where to change the title and which waypoints remain editable.
