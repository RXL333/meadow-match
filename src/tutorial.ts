import { icon, sheep } from "./icons";
import "./tutorial.css";

const SEEN_KEY = "meadow-match-tutorial-v1";
const steps = [
  {
    target: "#board",
    label: "叠层牌区",
    title: "从亮着的牌开始",
    copy: "点亮牌就能入篮。灰暗的牌被遮住了，拿走上面的牌后才能点。",
    extra: '<p class="tutorial-tip">可以连续点几张，不用等上一张飞完。</p>',
  },
  {
    target: "#rack",
    label: "七格篮子",
    title: "三张一样，自动消除",
    copy: "选中的牌会放在这里。同类凑够3张就会消除，腾出新的位置。",
    extra: '<div class="tutorial-match" aria-hidden="true"><span><i class="tile-art"></i></span><span><i class="tile-art"></i></span><span><i class="tile-art"></i></span><b>✦</b></div><p class="tutorial-tip">篮子只有7格。第7张放入后若不能消除，这一局就结束啦。</p>',
  },
  {
    target: ".game-summary",
    label: "关卡与进度",
    title: "看看走到哪儿了",
    copy: "这里显示关卡名称、剩余牌数和消除进度。清空牌区、篮子和暂存小站，就能过关。",
    extra: `<p class="tutorial-tip">右上角的 ${icon("reset")} 可以重开本关；已经通关的牧场足迹会保留。</p>`,
  },
  {
    target: ".tools",
    label: "辅助道具",
    title: "需要时，找小帮手",
    copy: "每种道具每关可用1次，灰色表示当前不可用。",
    extra: `<div class="tutorial-list"><p>${icon("move")}<span><strong>挪一挪</strong>篮子前面的最多3张移到暂存小站，记得取回消除。</span></p><p>${icon("back")}<span><strong>想一想</strong>撤回上一次选牌和消除。</span></p><p>${icon("shuffle")}<span><strong>换一换</strong>重排剩余牌面，数量不变。</span></p></div>`,
  },
  {
    target: ".main-nav",
    label: "游戏模式",
    title: "想去哪片牧场？",
    copy: "顶部的三个入口，可以随时切换。",
    extra: `<div class="tutorial-list"><p>${icon("leaf")}<span><strong>牧场漫游</strong>选择已解锁的关卡，慢慢挑战10片牧场。</span></p><p>${icon("sun")}<span><strong>每日挑战</strong>每天一份新牌局，按北京时间更新。</span></p><p>${icon("book")}<span><strong>牧场图鉴</strong>认识全部12种小图案。</span></p></div>`,
  },
  {
    target: ".header-actions",
    label: "声音与指南",
    title: "按自己喜欢的节奏玩",
    copy: "小喇叭可以开关音效；问号里有完整玩法、音效和“减少动态效果”设置。",
    extra: '<p class="tutorial-tip">忘记怎么玩了？点问号里的「再看一次新手引导」，小羊随时带你重逛。</p><p class="tutorial-signoff">不用赶时间，来收集第一份好心情吧。</p>',
  },
];

/** A presentation-only tour: the native modal keeps demonstration taps off the game. */
export class MeadowTutorial {
  private dialog = document.createElement("dialog");
  private scrollSpace = document.createElement("div");
  private panel: HTMLElement;
  private spotlight: HTMLElement;
  private content: HTMLElement;
  private next: HTMLButtonElement;
  private previous: HTMLButtonElement;
  private step = -1;
  private frame = 0;
  private opener: HTMLElement | null = null;
  private scroll = { x: 0, y: 0 };
  private observer: ResizeObserver;

  constructor() {
    this.dialog.id = "tutorial";
    this.dialog.className = "tutorial-dialog";
    this.dialog.setAttribute("aria-labelledby", "tutorial-title");
    this.dialog.setAttribute("aria-describedby", "tutorial-copy");
    this.dialog.innerHTML = `
      <div class="tutorial-shade" aria-hidden="true"></div>
      <div class="tutorial-spotlight" aria-hidden="true"><span></span></div>
      <section class="tutorial-panel">
        <div class="tutorial-topline"><span class="tutorial-eyebrow">YOUR FIRST LITTLE VISIT</span><button class="tutorial-skip" type="button">跳过引导 ${icon("close")}</button></div>
        <div class="tutorial-content" aria-live="polite" aria-atomic="true"></div>
        <div class="tutorial-footer"><button class="tutorial-previous" type="button">上一步</button><span class="tutorial-dots" aria-hidden="true"></span><button class="tutorial-next" type="button" autofocus>带我逛一圈 ${icon("arrow")}</button></div>
      </section>`;
    this.scrollSpace.className = "tutorial-scroll-space";
    this.scrollSpace.hidden = true;
    this.scrollSpace.setAttribute("aria-hidden", "true");
    document.body.append(this.scrollSpace, this.dialog);
    this.panel = this.dialog.querySelector(".tutorial-panel")!;
    this.spotlight = this.dialog.querySelector(".tutorial-spotlight")!;
    this.content = this.dialog.querySelector(".tutorial-content")!;
    this.next = this.dialog.querySelector(".tutorial-next")!;
    this.previous = this.dialog.querySelector(".tutorial-previous")!;
    this.next.addEventListener("click", () => {
      if (this.step === steps.length - 1) this.finish();
      else this.showStep(this.step + 1);
    });
    this.previous.addEventListener("click", () => this.showStep(this.step - 1));
    this.dialog.querySelector(".tutorial-skip")!.addEventListener("click", () => this.finish());
    this.dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.finish();
    });
    this.dialog.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const buttons = [...this.dialog.querySelectorAll<HTMLButtonElement>("button")]
        .filter((button) => button.getClientRects().length);
      const destination = event.shiftKey && document.activeElement === buttons[0]
        ? buttons.at(-1)
        : !event.shiftKey && document.activeElement === buttons.at(-1) ? buttons[0] : null;
      if (destination) {
        event.preventDefault();
        destination.focus({ preventScroll: true });
      }
    });
    this.observer = new ResizeObserver(this.followViewport);
  }

  showOnFirstVisit() {
    try {
      if (localStorage.getItem(SEEN_KEY) === "1") return;
    } catch {
      // Private or restricted storage must not prevent starting or dismissing the tour.
    }
    this.start();
  }

  start() {
    if (this.dialog.open) return;
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.scroll = { x: scrollX, y: scrollY };
    this.showStep(-1);
    this.dialog.showModal();
    this.layout();
    this.next.focus({ preventScroll: true });
    window.addEventListener("resize", this.followViewport);
    window.addEventListener("scroll", this.queueLayout, { passive: true });
    window.visualViewport?.addEventListener("resize", this.followViewport);
    this.observer.observe(this.panel);
  }

  private showStep(index: number) {
    this.step = index;
    // A short page still needs room to bring the target above its explanation on a phone.
    this.scrollSpace.hidden = index < 0;
    this.dialog.dataset.step = index < 0 ? "welcome" : String(index + 1);
    const step = steps[index];
    this.content.innerHTML = step
      ? `<div class="tutorial-step-label">${String(index + 1).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")} · ${step.label}</div><h2 id="tutorial-title">${step.title}</h2><p id="tutorial-copy">${step.copy}</p>${step.extra}`
      : `<div class="tutorial-welcome-sheep" aria-hidden="true">${sheep()}</div><div class="tutorial-step-label">一份给新朋友的牧场指南</div><h2 id="tutorial-title">欢迎来到小牧场</h2><p id="tutorial-copy">收集三份一样的小美好，就会有好事发生。跟着小羊，认识一下这里的每个角落吧。</p><p class="tutorial-signoff">6个小提示，随时可以跳过。</p>`;
    this.previous.hidden = index < 0;
    this.next.innerHTML = `${index < 0 ? "带我逛一圈" : index === steps.length - 1 ? "开始收集好心情" : "下一步"} ${icon("arrow")}`;
    this.dialog.querySelector(".tutorial-dots")!.innerHTML = steps.map((_, i) => `<i class="${i === index ? "current" : i < index ? "done" : ""}"></i>`).join("");
    if (this.dialog.open) {
      this.bringTargetIntoView();
      this.layout();
    }
  }

  private bringTargetIntoView() {
    const target = document.querySelector<HTMLElement>(steps[this.step]?.target ?? ":not(*)");
    if (!target) return;
    if (innerWidth < 900) {
      const rect = target.getBoundingClientRect();
      const room = (window.visualViewport?.height ?? innerHeight) - this.panel.offsetHeight - 48;
      const top = 20 + Math.max(0, (room - rect.height) / 2);
      window.scrollBy({ top: rect.top - top, behavior: "instant" });
    } else {
      target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    }
  }

  private queueLayout = () => {
    if (!this.dialog.open || this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.layout();
    });
  };

  private followViewport = () => {
    if (!this.dialog.open) return;
    this.layout();
    this.bringTargetIntoView();
    this.queueLayout();
  };

  private layout() {
    const width = document.documentElement.clientWidth;
    const height = window.visualViewport?.height ?? innerHeight;
    const edge = width < 400 ? 14 : 20;
    const gap = 18;
    const panelWidth = Math.min(390, width - edge * 2);
    this.panel.style.width = `${panelWidth}px`;
    const panelHeight = this.panel.offsetHeight;
    let left = (width - panelWidth) / 2;
    let top = Math.max(edge, (height - panelHeight) / 2);
    const target = steps[this.step] && document.querySelector(steps[this.step].target);
    this.spotlight.hidden = !target;
    if (target) {
      const rect = target.getBoundingClientRect();
      const x = Math.max(6, rect.left - 7);
      const y = Math.max(6, rect.top - 7);
      const right = Math.min(width - 6, rect.right + 7);
      let bottom = Math.min(height - 6, rect.bottom + 7);
      // A tall late-game board can exceed a small phone's available height.
      // Keep a visible part highlighted above the panel rather than covering the highlight.
      if (width < 900) bottom = Math.min(bottom, y + Math.max(0, height - panelHeight - gap - edge - y));
      Object.assign(this.spotlight.style, {
        left: `${x}px`, top: `${y}px`,
        width: `${Math.max(0, right - x)}px`, height: `${Math.max(0, bottom - y)}px`,
      });
      // Prefer a side panel on wide screens; on phones, leave the highlighted part visible.
      if (width >= 900 && right + gap + panelWidth <= width - edge) {
        left = right + gap;
        top = rect.top + (rect.height - panelHeight) / 2;
      } else if (width >= 900 && x - gap - panelWidth >= edge) {
        left = x - gap - panelWidth;
        top = rect.top + (rect.height - panelHeight) / 2;
      } else if (bottom + gap + panelHeight <= height - edge) {
        top = bottom + gap;
      } else if (y - gap - panelHeight >= edge) {
        top = y - gap - panelHeight;
      } else {
        top = height - panelHeight - edge;
      }
    }
    this.panel.style.left = `${left}px`;
    this.panel.style.top = `${Math.max(edge, Math.min(top, height - panelHeight - edge))}px`;
  }

  private finish() {
    if (!this.dialog.open) return;
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // The game remains usable even when the browser cannot remember this preference.
    }
    this.observer.disconnect();
    window.removeEventListener("resize", this.followViewport);
    window.removeEventListener("scroll", this.queueLayout);
    window.visualViewport?.removeEventListener("resize", this.followViewport);
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.scrollSpace.hidden = true;
    this.dialog.close();
    window.scrollTo({ left: this.scroll.x, top: this.scroll.y, behavior: "instant" });
    const focus = this.opener?.isConnected && this.opener.getClientRects().length && this.opener !== document.body
      ? this.opener
      : document.querySelector<HTMLElement>(".board-tile.available, #help-button");
    focus?.focus({ preventScroll: true });
  }
}
