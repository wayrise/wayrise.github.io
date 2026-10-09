const header = document.querySelector("[data-scroll-header]");
const intro = document.querySelector(".intro");
const introVideo = document.querySelector("[data-intro-video]");
const introToggle = document.querySelector("[data-intro-toggle]");
const introToggleLabel = document.querySelector("[data-intro-toggle-label]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const videos = [...document.querySelectorAll("video")];
const visibleVideos = new Set();
let introPausedByUser = false;
let introStartedByUser = false;

const syncHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY >= intro.offsetHeight);
};

window.addEventListener("scroll", syncHeader, { passive: true });
window.addEventListener("resize", syncHeader);
syncHeader();

const syncHeaderHeight = () => {
  document.documentElement.style.setProperty("--header-height", `${header.offsetHeight}px`);
};
syncHeaderHeight();
if ("ResizeObserver" in window) {
  new ResizeObserver(syncHeaderHeight).observe(header);
} else {
  window.addEventListener("resize", syncHeaderHeight);
}

// Keep the latest five updates visible; without JavaScript, all news is readable.
const newsList = document.querySelector("#news-list");
const newsToggle = document.querySelector("[data-news-toggle]");
const newsToggleLabel = newsToggle?.querySelector("[data-news-toggle-label]");
const olderNews = [...(newsList?.querySelectorAll(".news-item") || [])].slice(5);

if (newsToggle && newsToggleLabel && olderNews.length) {
  const setNewsExpanded = (expanded) => {
    olderNews.forEach((item) => { item.hidden = !expanded; });
    newsToggle.setAttribute("aria-expanded", String(expanded));
    newsToggleLabel.textContent = expanded ? "Show less news" : "Show all news";
  };

  setNewsExpanded(false);
  newsToggle.hidden = false;
  newsToggle.addEventListener("click", () => {
    setNewsExpanded(newsToggle.getAttribute("aria-expanded") !== "true");
  });
}

// Content stays visible when JavaScript or IntersectionObserver is unavailable.
if ("IntersectionObserver" in window && !reducedMotion.matches) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove("reveal-pending");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.08 });

  document.querySelectorAll(".reveal").forEach((item) => {
    item.classList.add("reveal-pending");
    revealObserver.observe(item);
  });
}

const syncPlaybackButton = () => {
  const paused = introVideo.paused;
  introToggle.classList.toggle("is-paused", paused);
  introToggle.setAttribute("aria-label", paused ? "Play background video" : "Pause background video");
  introToggleLabel.textContent = paused ? "Play video" : "Pause video";
};

const canPlay = (video) => {
  if (document.hidden || !visibleVideos.has(video)) return false;
  if (video.closest(".publication-card")?.hidden) return false;
  if (video === introVideo) {
    return !introPausedByUser && (!reducedMotion.matches || introStartedByUser);
  }
  // Native controls allow visitors to start project previews explicitly.
  return !reducedMotion.matches || (video.controls && !video.paused);
};

const updateVideo = (video) => {
  if (!canPlay(video)) {
    video.pause();
    return;
  }

  // Defer the cover download for visitors who prefer reduced motion.
  const source = video.querySelector("source[data-src]");
  if (source) {
    source.src = source.dataset.src;
    source.removeAttribute("data-src");
    video.load();
  }

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  const playback = video.play();
  playback?.then(() => {
    // Visibility may have changed while play was pending.
    if (!canPlay(video)) video.pause();
  }).catch(() => {
    // The poster and Play button remain available when autoplay is blocked.
  });
};

const updateVideos = () => videos.forEach(updateVideo);

videos.forEach((video) => {
  video.removeAttribute("autoplay");
  video.pause();
  if (video !== introVideo) video.controls = reducedMotion.matches;
});

if ("IntersectionObserver" in window) {
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting, intersectionRatio }) => {
      if (isIntersecting && intersectionRatio >= 0.01) visibleVideos.add(target);
      else visibleVideos.delete(target);
      updateVideo(target);
    });
  }, { threshold: 0.01 });
  videos.forEach((video) => videoObserver.observe(video));
} else {
  videos.forEach((video) => visibleVideos.add(video));
  updateVideos();
}

introToggle.hidden = false;
introToggle.addEventListener("click", () => {
  if (introVideo.paused) {
    introPausedByUser = false;
    introStartedByUser = true;
    updateVideo(introVideo);
  } else {
    introPausedByUser = true;
    introVideo.pause();
  }
});

["play", "pause", "error", "loadeddata"].forEach((event) => {
  introVideo.addEventListener(event, syncPlaybackButton);
});
syncPlaybackButton();

document.addEventListener("visibilitychange", updateVideos);
window.addEventListener("pageshow", updateVideos);

// Retry muted playback after a gesture without overriding an explicit pause.
const retryAutoplay = (event) => {
  if (!event.target.closest?.("[data-intro-toggle]")) updateVideos();
};
document.addEventListener("touchstart", retryAutoplay, { once: true, passive: true });
document.addEventListener("pointerdown", retryAutoplay, { once: true, passive: true });

reducedMotion.addEventListener("change", () => {
  introStartedByUser = false;
  videos.forEach((video) => {
    if (video !== introVideo) video.controls = reducedMotion.matches;
    if (reducedMotion.matches) video.pause();
  });
  document.querySelectorAll(".reveal-pending").forEach((item) => item.classList.remove("reveal-pending"));
  updateVideos();
});

// Without JavaScript, every paper remains available in the unified list.
const publicationSection = document.querySelector("#publications");
const publicationFilters = publicationSection?.querySelector(".publication-filters");
const publicationCards = [...(publicationSection?.querySelectorAll(".publication-card") || [])];
const publicationButtons = [...(publicationFilters?.querySelectorAll("[data-publication-filter]") || [])];
const publicationStatus = publicationSection?.querySelector("[data-publication-status]");

if (publicationFilters && publicationCards.length) {
  const selectedCount = publicationCards.filter((card) => card.dataset.selected === "true").length;
  publicationButtons.forEach((button) => {
    const count = button.querySelector(".filter-count");
    if (count) count.textContent = button.dataset.publicationFilter === "selected" ? selectedCount : publicationCards.length;
  });

  const filterPublications = (filter, announce = true) => {
    let shown = 0;
    publicationCards.forEach((card) => {
      card.hidden = filter === "selected" && card.dataset.selected !== "true";
      if (!card.hidden) shown += 1;
    });
    publicationButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.publicationFilter === filter));
    });
    if (announce && publicationStatus) {
      publicationStatus.textContent = `Showing ${shown} ${filter === "selected" ? "selected publications" : "publications"}.`;
    }
    // Stop hidden previews immediately; visible previews retain their playback rules.
    updateVideos();
  };

  publicationButtons.forEach((button) => {
    button.addEventListener("click", () => filterPublications(button.dataset.publicationFilter));
  });
  filterPublications("selected", false);
  publicationFilters.hidden = false;
}

// Keep the complete author lists in the HTML, with an optional compact view.
document.querySelectorAll("[data-expandable-authors]").forEach((authors) => {
  const compact = authors.querySelector("[data-authors-short]");
  const complete = authors.querySelector("[data-authors-full]");
  const toggle = authors.querySelector("[data-author-toggle]");
  const label = toggle?.querySelector("[data-author-toggle-label]");
  if (!compact || !complete || !toggle || !label) return;

  const setExpanded = (expanded) => {
    compact.hidden = expanded;
    complete.hidden = !expanded;
    toggle.setAttribute("aria-expanded", String(expanded));
    label.textContent = expanded ? "Hide detailed author list" : "Detailed author list";
  };

  setExpanded(false);
  toggle.hidden = false;
  toggle.addEventListener("click", () => setExpanded(toggle.getAttribute("aria-expanded") !== "true"));
});
