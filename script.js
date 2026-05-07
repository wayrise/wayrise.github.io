const header = document.querySelector("[data-scroll-header]");
const revealItems = document.querySelectorAll(".reveal");

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

document.addEventListener("pointermove", (event) => {
  const x = `${event.clientX}px`;
  const y = `${event.clientY}px`;
  document.documentElement.style.setProperty("--pointer-x", x);
  document.documentElement.style.setProperty("--pointer-y", y);
});
