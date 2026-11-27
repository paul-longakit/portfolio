(() => {
  const page = document.documentElement;
  if (page.dataset.buildMotion !== "pending") return;
  const anime = window.anime;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  if (typeof anime !== "function" || reducedMotion.matches) {
    delete page.dataset.buildMotion;
    return;
  }

  const sceneSelector = "[data-build-scene]";
  const targetSelector = "[data-build]";
  const frameSelector = '[data-build="frame"]';
  const skip = document.querySelector(".motion-skip");
  const sprite = document.querySelector(".workshop .worker");
  const letterEase = anime.easing("easeOutExpo");
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(page.lang) : null;
  const colors = ["#f493ad", "#baa0ff", "#8bd8bc"];
  const compact = matchMedia("(max-width: 42rem)");
  const active = new Map();
  const waiting = new Set();
  const finished = new WeakSet();
  let crewIndex = 0;

  function pieces(scene) {
    return [scene, ...scene.querySelectorAll(targetSelector)].filter(
      (target) => target.matches(targetSelector) && target.closest(sceneSelector) === scene,
    );
  }

  // Measure the real text, including wrapped lines and inline emphasis, without
  // splitting the accessible source or changing layout.
  function readGlyphs(target, relative) {
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    const glyphs = [];
    let wordStart = true;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const style = getComputedStyle(node.parentElement);
      const letters = segmenter
        ? Array.from(segmenter.segment(node.data), ({ segment }) => segment)
        : Array.from(node.data);
      let offset = 0;
      for (const letter of letters) {
        const start = offset;
        offset += letter.length;
        if (!letter.trim()) {
          wordStart = true;
          continue;
        }
        range.setStart(node, start);
        range.setEnd(node, offset);
        const rect = range.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const transform = style.textTransform;
        const text = transform === "uppercase" ? letter.toUpperCase() : letter;
        glyphs.push({
          box: relative(rect), text, wordStart,
          font: `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
          color: target.classList.contains("primary") ? "var(--text)" : style.color,
        });
        wordStart = false;
      }
    }
    return glyphs;
  }

  function stageScene(scene, done) {
    const stage = document.createElement("span");
    stage.className = "build-stage";
    stage.setAttribute("aria-hidden", "true");
    stage.style.setProperty("--crew", colors[crewIndex++ % colors.length]);
    const worker = sprite.cloneNode(true);
    worker.classList.add("stage-worker");
    stage.append(worker);
    scene.append(stage);

    const bounds = stage.getBoundingClientRect();
    const size = worker.getBoundingClientRect().width;
    const relative = ({ left, top, width, height }) => ({
      x: left - bounds.left, y: top - bounds.top, width, height,
    });
    const jobs = pieces(scene).map((target) => ({
      target,
      kind: target.dataset.build,
      box: relative(target.getBoundingClientRect()),
      glyphs: target.matches(frameSelector) ? [] : readGlyphs(target, relative),
    }));

    const events = [];
    const movingGlyphs = new Set();
    const props = document.createDocumentFragment();
    const frames = new Map();
    const route = [];
    let nextEvent = 0;
    const timeline = anime.timeline({
      autoplay: false,
      easing: "easeOutCubic",
      update: ({ currentTime }) => {
        while (events[nextEvent]?.at <= currentTime) events[nextEvent++].run();
        // Anime.js still owns the clock. Only touch letters in flight, not
        // every pending or already placed glyph on every timeline tick.
        for (const glyph of movingGlyphs) {
          const progress = (currentTime - glyph.at) / glyph.duration;
          if (progress >= 1) {
            glyph.tile.style.opacity = "1";
            glyph.tile.style.removeProperty("transform");
            movingGlyphs.delete(glyph);
          } else {
            const eased = letterEase(progress);
            glyph.tile.style.opacity = eased;
            glyph.tile.style.transform = `translateY(${(1 - eased) * glyph.rise}px)`;
          }
        }
      },
      complete: done,
    });
    const add = (targets, at, properties) => timeline.add({ targets, ...properties }, at);
    const onBeat = (at, run) => events.push({ at, run });

    function prop(kind, { x, y, width, height }, text = "") {
      const element = document.createElement("span");
      element.className = `build-${kind}`;
      Object.assign(element.style, {
        left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px`,
      });
      element.textContent = text;
      props.append(element);
      return element;
    }

    function dust({ x, y }, at) {
      const sparks = Array.from({ length: 4 }, () => prop("spark", { x, y, width: 4, height: 4 }));
      add(sparks, at, {
        translateX: (_, i) => [0, (i - 1.5) * 13],
        translateY: (_, i) => [0, -9 - (i % 2) * 12],
        opacity: [1, 0],
        rotate: [0, 65],
        duration: 330,
      });
    }

    function carry(box, at, stamp = false) {
      const duration = stamp ? 360 : 320;
      const landed = at + duration;
      const tile = prop(stamp ? "stamp" : "panel", box);
      route.push({ at: landed, x: box.x + Math.min(box.width / 4, 42), y: box.y + 8 });
      add(tile, at, {
        translateX: [stamp ? 0 : -26, 0],
        translateY: [stamp ? -28 : 15, 0],
        scale: [stamp ? 1.14 : .97, 1],
        opacity: [0, .9],
        duration,
      });
      add(tile, landed, { opacity: [.9, 0], duration: 280 });
      dust({ x: box.x + Math.min(box.width / 4, 42), y: box.y + Math.min(box.height / 2, 24) }, landed);
      return landed;
    }

    function typeset({ target, glyphs }, start) {
      if (!glyphs.length) return start;
      const step = glyphs.length > 50 ? 35 : 50;
      // Start a second line of work at a word boundary for longer passages.
      const split = glyphs.length > 80
        ? glyphs.findIndex(({ wordStart }, i) => i >= glyphs.length / 2 && wordStart)
        : -1;
      // Keep the same stagger and settling time while avoiding a full-text
      // Anime.js tween whose targets would be rewritten on every tick.
      const display = target.matches('h1, h2, h3, [data-build="stamp"]');
      const duration = display ? 320 : 190;
      const rise = display ? 14 : 6;
      let end = start;
      const tiles = glyphs.map(({ box, text, font, color }, i) => {
        const tile = prop("glyph", box, text);
        Object.assign(tile.style, { font, lineHeight: "1", color });
        tile.dataset.copy = target.id || (target.classList.contains("intro") ? "intro" : target.tagName.toLowerCase());
        const leadTrack = split === -1 || i < split;
        const at = start + (leadTrack ? i * step : 140 + (i - split) * step);
        const glyph = { tile, at, duration, rise };
        onBeat(at, () => movingGlyphs.add(glyph));
        end = Math.max(end, at + duration);
        if (leadTrack && i % (step === 35 ? 9 : 4) === 0) {
          route.push({ at, x: box.x, y: box.y + box.height });
        }
        return tile;
      });
      onBeat(end, () => {
        target.classList.add("is-built");
        for (const tile of tiles) tile.remove();
      });
      return end;
    }

    let cursor = 100;
    let end = cursor;
    for (const job of jobs) {
      const { target, kind, box } = job;
      const parentFrame = target.parentElement.closest(frameSelector);
      const start = Math.max(cursor, frames.get(parentFrame) ?? 0);
      if (kind === "frame") {
        const height = target.matches("section") ? Math.min(52, box.height) : box.height;
        const landed = carry({ ...box, height }, start);
        frames.set(target, landed);
        onBeat(landed, () => {
          target.classList.add("is-built");
          queueMicrotask(pump);
        });
        cursor = landed + 30;
        end = Math.max(end, cursor);
      } else {
        const stamp = kind === "stamp";
        const hasPanel = stamp || target.matches(".button, .build-piece, .tags li");
        const lettersStart = hasPanel
          ? carry(stamp ? { ...box, width: Math.min(150, box.width) } : box, start, stamp)
          : start;
        const lastLetter = typeset(job, lettersStart);
        if (!job.glyphs.length) onBeat(start, () => target.classList.add("is-built"));
        cursor = lettersStart + Math.min(355, (lastLetter - lettersStart) * .65);
        end = Math.max(end, lastLetter);
      }
    }

    // Give the worker one continuous route even when placements overlap.
    const clamp = (value, max) => Math.max(0, Math.min(value, max));
    const position = ({ x, y }) => ({
      x: clamp(x, bounds.width - size), y: clamp(y - size * .7, bounds.height - size),
    });
    route.sort((a, b) => a.at - b.at);
    let from = position(route[0] ?? { x: 0, y: 0 });
    let beat = 0;
    add(worker, 0, { opacity: [0, 1], duration: 140 });
    for (const cue of route) {
      if (cue.at - beat < 100) continue;
      const to = position(cue);
      const start = Math.max(beat, cue.at - 220);
      add(worker, start, {
        translateX: [from.x, to.x],
        translateY: [from.y, to.y],
        duration: cue.at - start,
      });
      from = to;
      beat = cue.at;
    }
    add(worker, end, { opacity: [1, 0], translateY: [from.y, from.y - 12], duration: 240 });
    events.sort((a, b) => a.at - b.at);
    stage.append(props);

    return {
      play: () => timeline.play(),
      dispose() {
        timeline.pause();
        stage.remove();
      },
    };
  }

  function settle(scene) {
    if (finished.has(scene)) return;
    finished.add(scene);
    active.get(scene)?.dispose();
    active.delete(scene);
    waiting.delete(scene);
    observer.unobserve(scene);
    for (const target of pieces(scene)) target.classList.add("is-built");
  }

  function pump() {
    if (page.dataset.buildMotion !== "active") return;
    const limit = compact.matches ? 2 : 3;
    for (const scene of waiting) {
      if (active.size >= limit) break;
      const rect = scene.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= innerHeight) continue;
      if (scene.parentElement.closest(`${frameSelector}:not(.is-built)`)) continue;
      waiting.delete(scene);
      try {
        const job = stageScene(scene, () => {
          settle(scene);
          pump();
        });
        active.set(scene, job);
        job.play();
      } catch (error) {
        stop();
        console.error("The mushroom workshop could not start.", error);
        break;
      }
    }
  }

  const observer = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (finished.has(target)) continue;
      if (isIntersecting && !active.has(target)) waiting.add(target);
      if (!isIntersecting) {
        waiting.delete(target);
        if (active.has(target)) settle(target);
      }
    }
    pump();
  });

  function stop() {
    if (page.dataset.buildMotion !== "active") return;
    delete page.dataset.buildMotion;
    observer.disconnect();
    waiting.clear();
    for (const scene of active.keys()) settle(scene);
    document.querySelectorAll(".build-stage").forEach((stage) => stage.remove());
    if (document.activeElement === skip) {
      skip.textContent = "Animation skipped";
      skip.setAttribute("aria-disabled", "true");
    }
  }

  // The route uses coordinates measured at startup. Finish interrupted scenes
  // rather than letting the crew work over stale coordinates after a reflow.
  let viewportWidth = innerWidth;
  addEventListener("resize", () => {
    if (innerWidth === viewportWidth) return;
    viewportWidth = innerWidth;
    for (const scene of active.keys()) settle(scene);
    pump();
  });
  document.addEventListener("focusin", ({ target }) => {
    if (page.dataset.buildMotion !== "active" || !target.matches(targetSelector)) return;
    for (let scene = target.closest(sceneSelector); scene; scene = scene.parentElement.closest(sceneSelector)) settle(scene);
    pump();
  });
  skip.addEventListener("click", stop);
  reducedMotion.addEventListener("change", ({ matches }) => {
    if (matches) stop();
  });
  document.querySelectorAll(sceneSelector).forEach((scene) => observer.observe(scene));
  page.dataset.buildMotion = "active";
})();
