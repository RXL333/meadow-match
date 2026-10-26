export let reducedMotion = false;
export function setReducedMotion(value: boolean) {
  reducedMotion = value;
  document.documentElement.classList.toggle("reduced-motion", value);
}
export async function animate(
  element: Element,
  frames: Keyframe[],
  duration = 300,
  easing = "cubic-bezier(.16,1,.3,1)",
) {
  if (reducedMotion || !element.animate) return;
  const animation = element.animate(frames, { duration, easing, fill: "none" });
  try {
    await animation.finished;
  } catch {
    /* Cancellation during navigation is expected. */
  }
}
export function pause(ms: number) {
  return new Promise<void>((resolve) =>
    setTimeout(resolve, reducedMotion ? 0 : ms),
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
  if (reducedMotion) return;
  const layer = document.querySelector("#effects")!;
  const count = celebration ? 65 : 14;
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
    const animation = particle.animate(
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
      {
        duration: celebration ? 1400 + Math.random() * 800 : 650,
        easing: "cubic-bezier(.2,.65,.4,1)",
      },
    );
    animation.finished.catch(() => {}).finally(() => particle.remove());
  }
}
