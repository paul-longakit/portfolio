(() => {
  const anime = window.anime;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (typeof anime !== "function" || reducedMotion.matches) return;

  const hero = document.querySelectorAll(".hero > *");
  anime({
    targets: hero,
    opacity: [0.55, 1],
    translateY: [16, 0],
    delay: anime.stagger(65),
    duration: 580,
    easing: "easeOutCubic",
  });

  const cards = document.querySelectorAll(".card, .skills > div");
  let observer;
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        anime({
          targets: entry.target,
          opacity: [0.7, 1],
          translateY: [12, 0],
          duration: 460,
          easing: "easeOutCubic",
        });
      }
    }, { threshold: 0.15 });
    cards.forEach((card) => observer.observe(card));
  }

  reducedMotion.addEventListener("change", ({ matches }) => {
    if (!matches) return;
    observer?.disconnect();
    anime.remove([...hero, ...cards]);
    for (const element of [...hero, ...cards]) {
      element.style.removeProperty("opacity");
      element.style.removeProperty("transform");
    }
  });
})();
