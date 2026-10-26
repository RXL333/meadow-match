import { animate, flyTo, particles, type CardFlight } from "./motion";

interface Entry {
  id: number;
  node: HTMLElement;
  flight: CardFlight;
  slot: number;
  matched: boolean;
}

export class BasketMotion {
  private entries = new Map<number, Entry>();

  constructor(
    private effects: HTMLElement,
    private onSettled: () => void,
    private onMatch: () => void,
  ) {}

  get busy() { return this.entries.size > 0; }
  has(id: number) { return this.entries.has(id); }

  private slots() {
    return [...document.querySelectorAll(".rack-cells > span")]
      .map((node) => node.getBoundingClientRect());
  }

  private create(id: number, markup: string, origin: DOMRect, slot: number, target: DOMRect): Entry {
    const node = document.createElement("div");
    node.className = "tile flying-tile";
    node.dataset.id = String(id);
    node.innerHTML = markup;
    this.effects.append(node);
    const entry = { id, node, slot, matched: false, flight: flyTo(node, origin, target) };
    this.entries.set(id, entry);
    void entry.flight.finished.then(() => {
      if (entry.matched || this.entries.get(id) !== entry) return;
      node.remove();
      this.entries.delete(id);
      this.onSettled();
      const landed = document.querySelector(`.tray-tile[data-id="${id}"]`);
      if (landed) void animate(landed, [
        { transform: "scale(1.06,.96)" },
        { transform: "scale(.98,1.03)" },
        { transform: "scale(1)" },
      ], 150);
    });
    return entry;
  }

  accept(id: number, markup: string, origin: DOMRect, intermediate: number[], matched: number[]) {
    const slots = this.slots();
    // Capture settled cards before the logical tray removes a completed triple.
    const settled = matched.filter((tid) => tid !== id && !this.entries.has(tid))
      .map((tid) => {
        const node = document.querySelector<HTMLElement>(`.tray-tile[data-id="${tid}"]`)!;
        return { id: tid, markup: node.innerHTML, rect: node.getBoundingClientRect() };
      });
    this.create(id, markup, origin, intermediate.indexOf(id), slots[intermediate.indexOf(id)]);
    if (!matched.length) return;

    for (const card of settled) {
      const slot = intermediate.indexOf(card.id);
      this.create(card.id, card.markup, card.rect, slot, slots[slot]);
    }
    const group = matched.map((tid) => this.entries.get(tid)!);
    for (const entry of group) {
      entry.matched = true;
      entry.slot = intermediate.indexOf(entry.id);
      entry.flight.retarget(slots[entry.slot]);
    }
    void this.clearGroup(group);
  }

  private async clearGroup(group: Entry[]) {
    try {
      await Promise.all(group.map((entry) => entry.flight.finished));
      if (group.some((entry) => this.entries.get(entry.id) !== entry)) return;
      const rects = group.map((entry) => entry.node.getBoundingClientRect());
      const center = rects[1];
      this.onMatch();
      particles(center.x + center.width / 2, center.y + center.height / 2);
      await Promise.all(group.map((entry, index) => animate(entry.node, [
        { transform: "translateX(0) scale(1)", opacity: 1 },
        { transform: `translate(${(center.x - rects[index].x) * 0.2}px,-8px) scale(1.1)`, opacity: 1, offset: 0.3 },
        { transform: `translate(${center.x - rects[index].x}px,-18px) scale(.15)`, opacity: 0 },
      ], 170)));
    } finally {
      for (const entry of group) {
        entry.node.remove();
        if (this.entries.get(entry.id) === entry) this.entries.delete(entry.id);
      }
      this.onSettled();
    }
  }

  retarget(tray: number[]) {
    if (!this.busy) return;
    const slots = this.slots();
    for (const entry of this.entries.values()) {
      if (!entry.matched) entry.slot = tray.indexOf(entry.id);
      if (slots[entry.slot]) entry.flight.retarget(slots[entry.slot]);
    }
  }

  clear() {
    for (const entry of this.entries.values()) {
      entry.flight.finish();
      entry.node.remove();
    }
    this.entries.clear();
  }
}
