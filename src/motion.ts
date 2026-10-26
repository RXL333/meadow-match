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
export function flip(elements: Map<number, DOMRect>, selector: string) {
  document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    const before = elements.get(Number(element.dataset.id));
    if (!before) return;
    const after = element.getBoundingClientRect();
    void animate(
      element,
      [
        {
          transform: `translate(${before.x - after.x}px,${before.y - after.y}px)`,
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
