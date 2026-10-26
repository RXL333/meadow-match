export let reducedMotion = false;
const activeAnimations = new Set<() => void>();

function finishAnimations() {
  [...activeAnimations].forEach((finish) => finish());
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) finishAnimations();
});
window.addEventListener("pagehide", finishAnimations);

export function setReducedMotion(value: boolean) {
  reducedMotion = value;
  document.documentElement.classList.toggle("reduced-motion", value);
  if (value) finishAnimations();
}
export async function animate(
  element: Element,
  frames: Keyframe[],
  duration = 300,
  easing = "cubic-bezier(.16,1,.3,1)",
) {
  if (reducedMotion || document.hidden || !element.animate) return;
  // A suspended timeline or an unavailable animation backend must never hold
  // the gameplay lock. Release every animation on finish, cancellation or deadline.
  await new Promise<void>((resolve) => {
    let animation: Animation | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      activeAnimations.delete(finish);
      try {
        animation?.cancel();
      } catch {
        // Some browser backends also reject cancellation after a context loss.
      }
      resolve();
    };
    try {
      animation = element.animate(frames, { duration, easing, fill: "none" });
      activeAnimations.add(finish);
      deadline = setTimeout(finish, duration + 150);
      void animation.finished.then(finish, finish);
    } catch {
      finish();
    }
  });
}
export function pause(ms: number) {
  return new Promise<void>((resolve) =>
    setTimeout(resolve, reducedMotion || document.hidden ? 0 : ms),
  );
}

export interface CardFlight {
  finished: Promise<void>;
  retarget(target: DOMRect): void;
  finish(): void;
}

// Each card owns its flight. Reordering the basket redirects it from its
// current visual position without restarting another card or blocking input.
export function flyTo(
  element: HTMLElement,
  from: DOMRect,
  initialTarget: DOMRect,
): CardFlight {
  let destination = initialTarget;
  let animation: Animation | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let revision = 0;
  let settled = false;
  let resolveFinished!: () => void;
  const expiresAt = performance.now() + 800;
  const finished = new Promise<void>((resolve) => { resolveFinished = resolve; });
  const place = (rect: DOMRect) => {
    Object.assign(element.style, {
      left: `${rect.left}px`, top: `${rect.top}px`,
      width: `${rect.width}px`, height: `${rect.height}px`,
    });
  };
  const finish = () => {
    if (settled) return;
    settled = true;
    revision++;
    clearTimeout(deadline);
    activeAnimations.delete(finish);
    try { animation?.cancel(); } catch { /* Backend may have been discarded. */ }
    place(destination);
    resolveFinished();
  };
  const move = (origin: DOMRect, duration: number) => {
    const version = ++revision;
    clearTimeout(deadline);
    try {
      animation?.cancel();
      place(origin);
      if (reducedMotion || document.hidden || !element.animate) {
        finish();
        return;
      }
      const dx = destination.left - origin.left;
      const dy = destination.top - origin.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 &&
          Math.abs(destination.width - origin.width) < 0.5) {
        finish();
        return;
      }
      const lift = Math.min(32, Math.abs(dy) * 0.15 + Math.abs(dx) * 0.08);
      animation = element.animate([
        { transform: "translate(0,0) scale(1)", rotate: "0deg" },
        { transform: `translate(${dx * 0.4}px,${dy * 0.3 - lift}px) scale(1.04)`, rotate: dx > 0 ? "4deg" : "-4deg", offset: 0.35 },
        { transform: `translate(${dx}px,${dy}px) scale(${destination.width / origin.width})`, rotate: "0deg" },
      ], { duration, easing: "cubic-bezier(.2,.65,.3,1)", fill: "forwards" });
      const complete = () => { if (version === revision) finish(); };
      deadline = setTimeout(complete, Math.min(duration + 150, Math.max(0, expiresAt - performance.now())));
      void animation.finished.then(complete, complete);
    } catch {
      finish();
    }
  };
  activeAnimations.add(finish);
  move(from, 230);
  return {
    finished,
    finish,
    retarget(target) {
      if (Math.abs(target.x - destination.x) < 0.5 &&
          Math.abs(target.y - destination.y) < 0.5 &&
          Math.abs(target.width - destination.width) < 0.5) return;
      if (settled) {
        destination = target;
        place(target);
        return;
      }
      const current = element.getBoundingClientRect();
      destination = target;
      move(current, 140);
    },
  };
}

export function flip(elements: Map<number, DOMRect>, selector: string) {
  document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    if (element.style.visibility === "hidden") return;
    const before = elements.get(Number(element.dataset.id));
    if (!before) return;
    const after = element.getBoundingClientRect();
    if (Math.abs(before.x - after.x) < 0.5 && Math.abs(before.y - after.y) < 0.5) return;
    element.getAnimations().forEach((animation) => animation.cancel());
    const target = element.getBoundingClientRect();
    void animate(
      element,
      [
        {
          transform: `translate(${before.x - target.x}px,${before.y - target.y}px)`,
        },
        { transform: "translate(0,0)" },
      ],
      270,
    );
  });
}
export function rectangles(selector: string): Map<number, DOMRect> {
  return new Map(
    [...document.querySelectorAll<HTMLElement>(selector)].map((element) => [
      Number(element.dataset.id),
      element.getBoundingClientRect(),
    ]),
  );
}
export function particles(x: number, y: number, celebration = false) {
  if (reducedMotion || document.hidden) return;
  const layer = document.querySelector("#effects")!;
  // Keep the effects layer bounded, including under rapid or interrupted play.
  const count = Math.min(celebration ? 48 : 12, 64 - layer.childElementCount);
  for (let i = 0; i < count; i++) {
    const particle = document.createElement("i");
    particle.className = `particle ${celebration ? "confetti" : ""}`;
    const colors = ["#edbf62", "#8aa66e", "#e5a097", "#f9f2cb", "#afc69e"];
    particle.style.cssText = `left:${x}px;top:${y}px;background:${colors[i % colors.length]};rotate:${i * 37}deg`;
    layer.append(particle);
    const angle = (i / count) * Math.PI * 2;
    const distance = celebration
      ? 160 + Math.random() * 380
      : 25 + Math.random() * 55;
    const dx = Math.cos(angle) * distance;
    const dy = celebration
      ? -90 - Math.random() * 190
      : Math.sin(angle) * distance;
    void animate(
      particle,
      [
        { transform: "translate(0,0) scale(.2)", opacity: 1 },
        {
          transform: `translate(${dx * 0.6}px,${dy}px) rotate(${dx}deg) scale(1)`,
          opacity: 1,
          offset: 0.45,
        },
        {
          transform: `translate(${dx}px,${celebration ? 500 : dy + 40}px) rotate(${dx * 3}deg) scale(.3)`,
          opacity: 0,
        },
      ],
      celebration ? 1400 + Math.random() * 800 : 650,
      "cubic-bezier(.2,.65,.4,1)",
    ).finally(() => particle.remove());
  }
}
