---
name: portfolio-motion
description: Choreograph and verify the mushroom crew and other interface animations with the local Anime.js library. Use when adding, tuning, or reviewing portfolio motion.
---

# Animate the workshop

- Use the vendored Anime.js 3.2.2 API in `animations.js`. Sequence a clear action: a worker arrives, places a piece, and exits or rests. Reserve the longest sequence for the opening scene; play scroll scenes once.
- Prefer transforms and opacity on decorative elements. Keep text and controls available immediately, and leave the final layout intact when animation is skipped or interrupted.
- Keep decorative SVGs out of the accessibility tree. Respect `prefers-reduced-motion` at load and when it changes; cancel active effects and remove temporary elements when switching to reduced motion.
- Preview from the local HTTP server. Check normal and reduced motion, desktop and narrow screens, and disabled JavaScript. For scroll scenes, verify the worker appears, leaves, and does not replay when scrolling back.
