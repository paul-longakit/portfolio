# Mushroom Build Reveal Implementation Plan

**Goal:** Make the crew visibly assemble the portfolio from a blank scaffold. No letter or content panel should be visible before its placement beat.

**Architecture:** Keep the existing semantic HTML and local Anime.js 3.2.2. The real page reserves layout space and retains its accessible names; the animation controls when each panel surface and visual text layer appears. Build only visible or nearly visible scenes, and make every interruption restore the real page.

## Behavior to ship

- All visible portfolio copy is placed grapheme by grapheme, including paragraphs, descriptions, tags, navigation, and the `87.8%` result. Skip controls remain visible from the start.
- Every visible container has its own placement beat: header, workshop rows, section frames, project cards, skill panels, result panel, action groups, and footer. Layout-only wrappers stay in the document to reserve space but get no extra decorative frame.
- Target **50 ms between letters** for short text, **35 ms** for body copy, and **280–360 ms** to carry and place a panel. For long passages, multiple crew placements can overlap so the rate stays legible without making the visitor wait for the entire page. Preview for roughly **3–4 seconds** to finish the hero, including its intro; no section waits on playback in another part of the page.
- Play once per scene per load. Skip, keyboard focus on an unbuilt link, reduced motion, JavaScript disabled, or a failed animation load must never strand hidden content.

## Task 1: Start blank without flashing or blocking access

**Files:** `index.html`, `styles.css`, `animations.js`; create `tests/mushroom-reveal.browser.mjs`.

- [ ] Add a Chrome browser check that captures the first paint with the main script delayed: in normal motion, the skip control and scaffold are visible but the name and card surfaces are not. Run it against the current build to reproduce the already-visible page.
- [ ] Add a small head bootstrap to opt in before first paint only when the browser supports the required APIs and motion is allowed. Use a startup timeout that clears the pending state if the engine fails to take over. Test with the local Anime.js request blocked and with JavaScript disabled.
- [ ] Add `data-build` markers for missing targets and distinguish leaves from panel surfaces. Reveal parent surfaces separately from child copy; don't hide a parent with opacity if that would also hide its worker and all child beats. Verify that CHRIMS's frame can be visible while its title, body, and result remain pending.
- [ ] Have the existing skip button settle all scenes and preserve focus. Focusing a still-pending link or jumping to an anchor must prioritize that destination and expose its link immediately on focus. Verify skip during playback, keyboard Tab, and direct loads of `#work`, `#experience`, and `#contact`.

## Task 2: Put each letter and panel on a slower placement beat

**Files:** `animations.js`, `styles.css`, `index.html`, `tests/mushroom-reveal.browser.mjs`.

- [ ] Extend the existing `readGlyphs` path to all visible text targets. Measure with the real text still taking up space. Build decorative glyphs only for the current scene; hide the visual source until its full text has been placed, then swap it in without duplicate text or a layout jump. Keep the decorative layer out of the accessibility tree.
- [ ] Update `typeset` and `carry` to put each worker at the point of placement. Schedule `stamp` as a worker landing the panel followed by individual digits. Check a mid-animation frame where some letters are in place, the next letter is absent, and a sibling panel is still blank. Check final content at the same positions as the static layout.
- [ ] Apply the timing targets and cap live workers at **2 on narrow screens, 3 elsewhere**. On resize, skip, reduced-motion changes, or scrolling away mid-scene, settle affected scenes and discard their effects. A newly visible scene must not wait behind one that is offscreen. Verify fast scrolling and scroll-back on desktop and at 320px.

## Task 3: Verify the local preview

**Files:** `tests/mushroom-reveal.browser.mjs`, `README.md`.

- [ ] Run `python3 -m http.server 8000 --bind 127.0.0.1` if the existing server is not running, then `node tests/mushroom-reveal.browser.mjs`. The browser check should cover initial, partial, and settled rendering; no first-paint flash; playback once; frame-before-copy ordering; skip; live and initial reduced motion; disabled JavaScript; failed dependencies; keyboard focus; direct anchors; and no horizontal overflow at 320px.
- [ ] Preview the hero and CHRIMS manually and adjust timing only if the placements are hard to follow. Confirm at least one body paragraph also builds letter by letter. Run `node --check animations.js` and `git diff --check` before reporting.
