const header = document.querySelector("[data-scroll-header]");
const revealItems = document.querySelectorAll(".reveal");
const previewVideos = document.querySelectorAll("video");

const syncHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 12);
};

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

revealItems.forEach((item) => observer.observe(item));
window.addEventListener("scroll", syncHeader, { passive: true });
syncHeader();

const playPreviewVideos = () => {
  previewVideos.forEach((video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    const playback = video.play();
    if (playback) {
      playback.catch(() => {
        // Some mobile browsers retry muted autoplay after the first page gesture.
      });
    }
  });
};

playPreviewVideos();
window.addEventListener("load", playPreviewVideos, { once: true });
window.addEventListener("pageshow", playPreviewVideos);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    playPreviewVideos();
  }
});
document.addEventListener("touchstart", playPreviewVideos, { once: true, passive: true });
document.addEventListener("pointerdown", playPreviewVideos, { once: true, passive: true });

document.addEventListener("pointermove", (event) => {
  const x = `${event.clientX}px`;
  const y = `${event.clientY}px`;
  document.documentElement.style.setProperty("--pointer-x", x);
  document.documentElement.style.setProperty("--pointer-y", y);
});
