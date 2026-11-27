(() => {
  const root = document.querySelector(".live-builder");
  if (!root || !Element.prototype.animate || !("IntersectionObserver" in window) || !("ResizeObserver" in window)) return;

  // Times are in milliseconds. Free waypoints are fractions of the illustration;
  // click and drop points come from the actual controls and slots.
  const timing = {
    biome: 1050, pick: 2250, drag: 2820, drop: 3420, title: 4400,
    typed: 5480, hold: 7350, reset: 7660, end: 8000,
  };
  const points = {
    start: [.37, .32], drag: [.36, .42], rest: [.78, .75],
  };
  const ease = "cubic-bezier(.25,.65,.28,1)";
  const travelEase = "cubic-bezier(.4,0,.2,1)";
  const exitEase = "cubic-bezier(.3,0,1,1)";
  const find = (part) => root.querySelector(`.builder-${part}`);
  const viewport = find("viewport");
  const scene = find("scene");
  const button = find("control");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const segmenter = typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(document.documentElement.lang, { granularity: "grapheme" })
    : null;
  let tracks = [];
  let letters;
  let visible = false;
  let userPaused = false;
  let running = false;

  function track(target, frames) {
    const animation = target.animate(frames.map(([time, styles, easing = ease]) => ({
      ...styles, offset: time / timing.end, easing,
    })), { duration: timing.end, iterations: Infinity });
    animation.pause();
    animation.currentTime = 0;
    tracks.push(animation);
  }

  const translation = ([x, y]) => ({ transform: `translate3d(${x}px,${y}px,0)` });
  const opacity = (value) => ({ opacity: value });
  const scale = (value) => ({ transform: `scale(${value})` });
  const offset = ([x, y], dx, dy) => [x + dx, y + dy];

  function measureAnchors(viewport) {
    const view = viewport.getBoundingClientRect();
    const field = scene.getBoundingClientRect();
    const project = find("project").getBoundingClientRect();
    function center(part) {
      const box = find(part).getBoundingClientRect();
      return [box.left - view.left + box.width / 2, box.top - view.top + box.height / 2];
    }
    const free = ([x, y]) => [x * field.width, y * field.height];
    return {
      start: free(points.start), drag: free(points.drag), rest: free(points.rest),
      biome: center("glow"), pick: center("source"), drop: center("target"),
      title: [project.left - view.left + 10, project.top - view.top + 10],
    };
  }

  function typeTitle(start, typed, reset, end) {
    const title = find("title");
    const text = title.textContent.trim();
    const segments = segmenter ? Array.from(segmenter.segment(text), ({ segment }) => segment) : Array.from(text);
    if (!segments.length) return;
    letters = document.createElement("span");
    letters.className = "builder-letters";
    letters.setAttribute("aria-hidden", "true");
    const glyphs = [];
    for (const text of segments) {
      if (!text.trim()) {
        letters.append(text);
        continue;
      }
      const glyph = document.createElement("span");
      glyph.textContent = text;
      letters.append(glyph);
      glyphs.push(glyph);
    }
    title.after(letters);
    for (const [i, glyph] of glyphs.entries()) {
      const at = start + (typed - start) * (i + 1) / glyphs.length;
      track(glyph, [[0, opacity(0), "step-end"], [at, opacity(1), "step-end"], [typed + 1, opacity(0)], [end, opacity(0)]]);
    }
    track(title, [[0, opacity(0), "step-end"], [typed + 1, opacity(1), "step-end"],
      [reset, opacity(0)], [end, opacity(0)]]);
  }

  function build(anchors) {
    const { biome, pick, drag, drop, title, typed, hold, reset, end } = timing;
    const dragPath = [
      [pick + 120, translation(anchors.pick), travelEase],
      [drag, translation(anchors.drag), travelEase],
      [drop, translation(anchors.drop)],
    ];
    track(find("cursor"), [
      [0, { ...translation(anchors.start), opacity: 0 }],
      [240, { ...translation(anchors.start), opacity: 1 }, travelEase],
      [biome, translation(anchors.biome)], [biome + 260, translation(anchors.biome), travelEase],
      [pick, translation(anchors.pick)], ...dragPath,
      [drop + 280, translation(anchors.drop), travelEase], [title, translation(anchors.title)],
      [typed, translation(anchors.title), travelEase], [typed + 650, { ...translation(anchors.rest), opacity: 1 }],
      [hold, { ...translation(anchors.rest), opacity: 0 }], [end, opacity(0)],
    ]);
    track(find("hand"), [
      [0, scale(1)], [biome, scale(1)], [biome + 90, scale(.78)], [biome + 245, scale(1)],
      [pick, scale(1)], [pick + 100, scale(.86)], [drop, scale(.86)], [drop + 150, scale(1)],
      [title, scale(1)], [title + 85, scale(.84)], [title + 205, scale(1)], [end, scale(1)],
    ]);
    // Move the badge clear of the left edge and title while the cursor types.
    const tucked = { transform: "translate3d(0,0,0)" };
    const raised = { transform: "translate3d(calc(100% + 1.15rem),-3.2rem,0)" };
    track(find("hand").querySelector("span"), [
      [0, tucked], [title - 300, tucked], [title, raised],
      [typed, raised], [typed + 400, tucked], [end, tucked],
    ]);
    for (const part of ["palette", "glow-light"]) {
      track(find(part), [[0, opacity(0)], [biome + 90, opacity(0)], [biome + 480, opacity(1)],
        [hold, opacity(1)], [reset, opacity(0)], [end, opacity(0)]]);
    }
    const pill = (value) => ({ transform: `translateY(-50%) scale(${value})` });
    track(find("biome"), [
      [0, pill(1)], [biome, pill(1)], [biome + 90, pill(.94)],
      [biome + 250, pill(1)], [end, pill(1)],
    ]);
    // The sprite follows the pointer exactly during the drag, then overshoots
    // the grid square slightly before settling.
    track(find("sprite"), [
      [0, { ...translation(anchors.pick), opacity: 1 }], ...dragPath,
      [drop + 100, translation(offset(anchors.drop, 5, 4))], [drop + 200, translation(offset(anchors.drop, -2, -2))],
      [drop + 320, translation(anchors.drop)], [hold, { ...translation(anchors.drop), opacity: 1 }, exitEase],
      [reset, { ...translation(anchors.drop), opacity: 0 }],
      [reset + 1, { ...translation(anchors.pick), opacity: 0 }],
      [end, { ...translation(anchors.pick), opacity: 1 }],
    ]);
    track(find("snap"), [
      [0, { ...opacity(0), ...scale(.92) }], [drop, { ...opacity(0), ...scale(.92) }],
      [drop + 90, { ...opacity(.95), ...scale(1.04) }], [drop + 400, { ...opacity(0), ...scale(1) }],
      [end, opacity(0)],
    ]);
    track(find("project"), [[0, opacity(0)], [title, opacity(0)], [title + 180, opacity(1)],
      [hold, opacity(1)], [reset, opacity(0)], [end, opacity(0)]]);
    typeTitle(title + 180, typed, reset, end);
    track(find("spores"), [[0, opacity(0)], [typed, opacity(0)], [typed + 240, opacity(.95)],
      [typed + 720, opacity(.58)], [hold, opacity(.58)], [reset, opacity(0)], [end, opacity(0)]]);
  }

  function clear() {
    for (const animation of tracks) animation.cancel();
    tracks = [];
    letters?.remove();
    letters = undefined;
    running = false;
  }

  function sync(remeasure = false) {
    button.hidden = reduced.matches;
    if (reduced.matches) {
      clear();
      return;
    }
    const playing = visible && !document.hidden && !userPaused;
    const time = Number(tracks[0]?.currentTime ?? 0);
    if (remeasure && tracks.length) clear();
    if (!tracks.length && (playing || remeasure)) {
      build(measureAnchors(viewport));
      for (const animation of tracks) animation.currentTime = time;
    }
    if (running === playing) return;
    const start = document.timeline.currentTime - time;
    for (const animation of tracks) {
      if (playing) {
        animation.play();
        animation.startTime = start;
      } else {
        animation.pause();
        animation.currentTime = time;
      }
    }
    running = playing;
  }

  button.addEventListener("click", () => {
    userPaused = !userPaused;
    button.textContent = userPaused ? "Play demo" : "Pause demo";
    sync();
  });
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio >= .15;
    sync();
  }, { threshold: [.15] });
  observer.observe(viewport);
  const remeasure = () => {
    if (tracks.length) sync(true);
  };
  const resize = new ResizeObserver(remeasure);
  resize.observe(viewport);
  resize.observe(scene);
  new MutationObserver(remeasure).observe(find("title"), { childList: true, characterData: true, subtree: true });
  reduced.addEventListener("change", () => sync());
  document.addEventListener("visibilitychange", () => sync());
  sync();
})();
