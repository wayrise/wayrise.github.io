(() => {
  const background = document.querySelector("[data-dot-background]");
  const canvas = background?.querySelector("[data-dot-grid]");
  if (!canvas) return;

  let context;
  try {
    context = canvas.getContext("2d");
  } catch {
    return;
  }
  if (!context) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const intro = document.querySelector(".intro");
  const spacing = 28;
  const influenceRadius = 160;
  const pointer = { x: 0, y: 0, inside: false };
  let dots = [];
  let width = 0;
  let height = 0;
  let frame = 0;
  let previousTime = 0;
  let enabled = false;
  let introBounds = null;
  let covered = false;

  const stop = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  };

  const pointerIsActive = () => {
    if (!enabled || document.hidden || covered || !pointer.inside) return false;
    return !introBounds || pointer.x < introBounds.left || pointer.x > introBounds.right
      || pointer.y < introBounds.top || pointer.y > introBounds.bottom;
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);
    // Draw the quiet part of the grid in one path, then its few changing dots.
    context.fillStyle = "rgba(113, 126, 117, 0.18)";
    context.beginPath();
    dots.forEach((dot) => {
      if (dot.strength !== 0) return;
      const x = dot.x + dot.dx;
      const y = dot.y + dot.dy;
      context.moveTo(x + 0.8, y);
      context.arc(x, y, 0.8, 0, Math.PI * 2);
    });
    context.fill();
    dots.forEach((dot) => {
      if (dot.strength === 0) return;
      context.fillStyle = `rgba(113, 126, 117, ${0.18 + dot.strength * 0.32})`;
      context.beginPath();
      context.arc(dot.x + dot.dx, dot.y + dot.dy, 0.8 + dot.strength * 0.8, 0, Math.PI * 2);
      context.fill();
    });
  };

  const resetDots = () => {
    dots.forEach((dot) => {
      dot.dx = 0;
      dot.dy = 0;
      dot.strength = 0;
    });
  };

  const animate = (time) => {
    frame = 0;
    if (!enabled || document.hidden || covered) {
      previousTime = 0;
      return;
    }
    const elapsed = previousTime ? Math.min(time - previousTime, 40) : 1000 / 60;
    previousTime = time;
    const easing = 1 - Math.pow(0.8, elapsed / (1000 / 60));
    const active = pointerIsActive();
    let unsettled = false;

    dots.forEach((dot) => {
      let targetX = 0;
      let targetY = 0;
      let targetStrength = 0;
      if (active) {
        const offsetX = dot.x - pointer.x;
        const offsetY = dot.y - pointer.y;
        const distance = Math.hypot(offsetX, offsetY);
        if (distance < influenceRadius) {
          targetStrength = Math.pow(1 - distance / influenceRadius, 2);
          const displacement = targetStrength * 16 / (distance || 1);
          targetX = offsetX * displacement;
          targetY = offsetY * displacement;
        }
      }

      dot.dx += (targetX - dot.dx) * easing;
      dot.dy += (targetY - dot.dy) * easing;
      dot.strength += (targetStrength - dot.strength) * easing;
      if (Math.abs(targetX - dot.dx) < 0.015
          && Math.abs(targetY - dot.dy) < 0.015
          && Math.abs(targetStrength - dot.strength) < 0.002) {
        dot.dx = targetX;
        dot.dy = targetY;
        dot.strength = targetStrength;
      } else {
        unsettled = true;
      }
    });

    draw();
    if (unsettled) frame = window.requestAnimationFrame(animate);
    else previousTime = 0;
  };

  const requestDraw = () => {
    if (enabled && !document.hidden && !covered && !frame) {
      frame = window.requestAnimationFrame(animate);
    }
  };

  const measureIntro = () => {
    introBounds = intro?.getBoundingClientRect() ?? null;
    covered = Boolean(introBounds && introBounds.top <= 0 && introBounds.left <= 0
      && introBounds.bottom >= height && introBounds.right >= width);
  };

  const resize = () => {
    if (!enabled) return;
    stop();
    width = background.clientWidth;
    height = background.clientHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    dots = [];
    for (let y = spacing / 2; y < height; y += spacing) {
      for (let x = spacing / 2; x < width; x += spacing) {
        dots.push({ x, y, dx: 0, dy: 0, strength: 0 });
      }
    }
    measureIntro();
    draw();
    if (pointerIsActive()) requestDraw();
  };

  const syncMode = () => {
    enabled = !reducedMotion.matches && finePointer.matches;
    background.classList.toggle("is-interactive", enabled);
    stop();
    pointer.inside = false;
    if (enabled) resize();
  };

  const releasePointer = () => {
    pointer.inside = false;
    requestDraw();
  };

  window.addEventListener("pointermove", (event) => {
    if (!enabled || event.pointerType === "touch") return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.inside = pointer.x >= 0 && pointer.x <= width && pointer.y >= 0 && pointer.y <= height;
    requestDraw();
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", releasePointer, { passive: true });
  window.addEventListener("pointercancel", releasePointer, { passive: true });
  window.addEventListener("blur", releasePointer);
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", () => {
    if (!enabled) return;
    const wasActive = pointerIsActive();
    measureIntro();
    if (covered) {
      stop();
      resetDots();
      draw();
    } else if (wasActive !== pointerIsActive()) {
      requestDraw();
    }
  }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    stop();
    pointer.inside = false;
    if (document.hidden) resetDots();
    else resize();
  });
  reducedMotion.addEventListener("change", syncMode);
  finePointer.addEventListener("change", syncMode);
  syncMode();
})();
