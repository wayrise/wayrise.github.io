(() => {
  // Selected papers keep their counts in either view; All-only papers stay plain.
  const counts = document.querySelectorAll('#publications .publication-card[data-selected="true"] [data-github-stars]');
  const requests = new Map();
  const formatter = new Intl.NumberFormat("en-US");
  const isCount = (value) => Number.isSafeInteger(value) && value >= 0;

  const readCache = (key) => {
    try {
      const count = JSON.parse(localStorage.getItem(key));
      return isCount(count) ? count : null;
    } catch {
      return null;
    }
  };

  const fetchCount = (repository) => {
    const key = repository.toLowerCase();
    if (!requests.has(key)) {
      // Refresh once per repository per visit, even when a cached count exists.
      requests.set(key, (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await fetch(`https://api.github.com/repos/${repository}`, {
            headers: { Accept: "application/vnd.github+json" },
            credentials: "omit",
            signal: controller.signal,
          });
          if (!response.ok) return null;
          const data = await response.json();
          return isCount(data.stargazers_count) ? data.stargazers_count : null;
        } catch {
          return null;
        } finally {
          clearTimeout(timeout);
        }
      })());
    }
    return requests.get(key);
  };

  const refreshers = new Map();
  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          refreshers.get(entry.target)?.();
        });
      }, { rootMargin: "400px" })
    : null;

  counts.forEach((countLabel) => {
    const link = countLabel.closest("a");
    const url = new URL(link.href);
    const [owner, name] = url.pathname.split("/").filter(Boolean);
    if (url.hostname !== "github.com" || !owner || !name) return;
    const repository = `${encodeURIComponent(owner)}/${encodeURIComponent(name.replace(/\.git$/i, ""))}`;
    const cacheKey = `publication-github-stars:${repository.toLowerCase()}`;
    const accessibleLabel = link.getAttribute("aria-label") || "GitHub repository";

    const displayCount = (count, cached = false) => {
      countLabel.textContent = ` (${formatter.format(count)} ★)`;
      countLabel.hidden = false;
      link.setAttribute("aria-label", `${accessibleLabel}, ${formatter.format(count)} stars`);
      link.title = `${cached ? "Last known count: " : ""}${formatter.format(count)} stars on GitHub`;
    };

    const cached = readCache(cacheKey);
    if (cached !== null) displayCount(cached, true);

    const refresh = async () => {
      const count = await fetchCount(repository);
      if (count === null) return;
      displayCount(count);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(count));
      } catch {
        // Counts still work when browser storage is unavailable.
      }
    };

    if (observer) {
      refreshers.set(link, refresh);
      observer.observe(link);
    } else {
      refresh();
    }
  });
})();
