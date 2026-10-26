import "./style.css";
import {
  Game,
  KINDS,
  LEVELS,
  BOARD_WIDTH,
  availableTiles,
  dailySeed,
  shanghaiDate,
  type GameState,
} from "./game";
import { boardHeight } from "./layouts";
import { icon, sheep } from "./icons";
import { MeadowAudio } from "./audio";
import { readProgress, saveProgress } from "./storage";
import {
  animate,
  flip,
  rectangles,
  particles,
  pause,
  setReducedMotion,
  reducedMotion,
} from "./motion";

const app = document.querySelector<HTMLDivElement>("#app")!;
const progress = readProgress();
const audio = new MeadowAudio();
audio.enabled = progress.sound;
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
setReducedMotion(progress.reducedMotion || motionPreference.matches);
motionPreference.addEventListener("change", () =>
  setReducedMotion(progress.reducedMotion || motionPreference.matches),
);

let mode: "journey" | "daily" = "journey";
let currentDay = shanghaiDate();
let currentLevel = Math.min(
  9,
  Array.from({ length: 10 }, (_, i) => i).find(
    (i) => !progress.completed.includes(i),
  ) ?? 9,
);
let game = new Game(currentLevel);
let busy = false;
let toastTimeout: ReturnType<typeof setTimeout>;

app.innerHTML = `
  <div class="landscape" aria-hidden="true"></div><div class="landscape-wash" aria-hidden="true"></div>
  <header class="site-header">
    <a class="brand" href="#" aria-label="羊咩咩首页">${sheep("brand-sheep")}<span class="brand-copy"><strong>羊咩咩<span class="brand-dot">.</span></strong><small>MEADOW MATCH</small></span></a>
    <nav class="main-nav" aria-label="游戏模式"><button id="journey-nav" class="nav-item active">${icon("leaf")}<span>牧场漫游</span></button><button id="daily-nav" class="nav-item">${icon("sun")}<span>每日挑战</span><i class="new-dot"></i></button><button id="collection-nav" class="nav-item">${icon("book")}<span>牧场图鉴</span></button></nav>
    <div class="header-actions"><button id="sound-toggle" class="icon-button" aria-label="开启声音" aria-pressed="false">${icon("muted")}</button><button id="help-button" class="icon-button" aria-label="玩法与设置">${icon("help")}</button></div>
  </header>
  <main class="meadow-layout">
    <section class="welcome" aria-label="欢迎来到羊咩咩牧场">
      <div class="eyebrow"><span></span>A LITTLE BREAK, A LITTLE JOY</div>
      <h1>让好心情，<br>三三<span class="title-accent">成群<svg viewBox="0 0 190 22" aria-hidden="true"><path d="M4 12Q83-2 184 10M26 18Q108 8 167 16"/></svg></span>。</h1>
      <p class="welcome-description">收集三份小美好，<br>把忙碌留在牧场外。</p>
      <div class="welcome-label">${icon("flower")}<span>不用赶时间，慢慢来就好</span></div>
      <div class="sheep-note">${sheep("welcome-sheep")}<div class="speech-bubble">今天也要<br><b>咩事发生～</b><span class="bubble-heart">${icon("heart")}</span></div></div>
      <div class="welcome-bottom"><span class="little-flower">✳</span><span>一小片牧场，一大份快乐。</span></div>
    </section>
    <section class="game-column" aria-label="三消游戏">
      <div class="game-card">
        <div class="game-topline"><span class="level-tag" id="level-tag">第 01 关</span><button id="restart-button" class="icon-button small" aria-label="重新开始本关">${icon("reset")}</button></div>
        <div class="level-heading"><h2 id="level-name">初见牧场</h2><span id="remaining-count" class="remaining-count">${icon("leaf")}<b>36</b> / 36</span></div>
        <div class="progress-track" role="progressbar" aria-label="本关消除进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="level-progress"></div></div>
        <div class="board-wrap"><div id="board" class="board" aria-label="叠层牌区"></div><div class="board-doodle doodle-a">${icon("flower")}</div><div class="board-doodle doodle-b">${icon("leaf")}</div><div class="board-empty" id="board-empty" hidden>${icon("check")}<span>小美好，都收集好啦</span></div></div>
        <div class="tray-heading"><span id="tray-message">${icon("leaf")}<span>三张一样，就会有好事发生</span></span><span id="tray-count">0<span> / 7</span></span></div>
        <div id="rack" class="rack"><div class="rack-cells">${Array.from({ length: 7 }, () => "<span></span>").join("")}</div><div id="tray" class="tray" aria-label="7格暂存卡槽"></div></div>
        <div id="reserve" class="reserve" hidden></div>
        <div class="card-bottom-note"><span class="status-dot"></span><span id="board-hint">点击亮着的牌，试着凑齐三张</span></div>
      </div>
      <div class="tools" aria-label="辅助道具">
        <button class="tool" id="tool-remove" data-tool="remove"><span class="tool-visual tool-sage">${icon("move")}<b class="tool-count">1</b></span><strong>挪一挪</strong><small>移出三张</small></button>
        <button class="tool" id="tool-undo" data-tool="undo"><span class="tool-visual tool-butter">${icon("back")}<b class="tool-count">1</b></span><strong>想一想</strong><small>撤回一步</small></button>
        <button class="tool" id="tool-shuffle" data-tool="shuffle"><span class="tool-visual tool-peach">${icon("shuffle")}<b class="tool-count">1</b></span><strong>换一换</strong><small>重新洗牌</small></button>
      </div>
      <p class="tool-footnote">每种小帮手，每关可以使用一次</p>
    </section>
    <aside class="side-notes" aria-label="牧场手记与进度">
      <div class="weather-note">${icon("sun")}<span>牧场晴天<small>适宜：放空与小小挑战</small></span></div>
      <section class="field-note"><div class="note-pin"></div><div class="note-label">FIELD NOTES <span>01</span></div><h3>牧场小贴士</h3><div class="mini-match"><span class="mini-tile"><i class="tile-art" style="--col:0;--row:0"></i></span><span class="mini-tile"><i class="tile-art" style="--col:0;--row:0"></i></span><span class="mini-tile"><i class="tile-art" style="--col:0;--row:0"></i></span><b>✦</b></div><p id="strategy-tip">先观察，再点击。<br>给下一份小美好，<br>留一点位置。</p><span class="handwritten">慢一点，惊喜就多一点。</span></section>
      <section class="journey-progress"><div class="journey-title"><span>${icon("leaf")}我的牧场足迹</span><b id="journey-count">0 / 10</b></div><div class="journey-dots" id="journey-dots"></div><button id="levels-button">去别处逛逛 ${icon("arrow")}</button></section>
      <div class="daily-invite"><span class="daily-stamp">${icon("sun")}</span><div><strong>今日，来点新鲜的？</strong><p id="daily-invite-copy">每天一份专属小挑战</p></div><button id="daily-invite" aria-label="进入每日挑战">${icon("arrow")}</button></div>
    </aside>
  </main>
  <footer class="site-footer"><span>用一点点专注，换一整颗好心情。</span><span>MADE FOR YOUR LITTLE BREAKS ${icon("leaf")}</span></footer>
  <div id="effects" aria-hidden="true"></div><div id="toast" role="status" aria-live="polite"></div>
  <dialog id="modal" class="modal" aria-labelledby="modal-title"><button id="modal-close" class="icon-button modal-close" aria-label="关闭弹窗">${icon("close")}</button><div id="modal-content"></div></dialog>
`;

const element = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const modal = element<HTMLDialogElement>("modal");

function art(kind: number): string {
  return `<i class="tile-art" style="--col:${kind % 4};--row:${Math.floor(kind / 4)}" aria-hidden="true"></i>`;
}
function tileHTML(id: number, className: string, disabled = false): string {
  const tile = game.state.tiles[id];
  return `<button type="button" class="tile ${className}" data-id="${id}" data-kind="${tile.kind}" aria-label="${KINDS[tile.kind].name}${disabled ? "，被上层遮挡" : ""}" ${disabled ? "disabled" : ""}>${art(tile.kind)}</button>`;
}
const boardNodes = new Map<number, HTMLButtonElement>();
let renderedGame: Game | undefined;
function renderBoard(entrance = false) {
  const board = element("board");
  if (renderedGame !== game) {
    board.replaceChildren();
    boardNodes.clear();
    renderedGame = game;
    board.style.aspectRatio = `${BOARD_WIDTH} / ${boardHeight(game.state.level)}`;
  }
  const present = new Set(game.state.board);
  for (const [id, node] of boardNodes) {
    if (!present.has(id)) {
      node.remove();
      boardNodes.delete(id);
    }
  }
  const available = new Set(availableTiles(game.state));
  const additions = document.createDocumentFragment();
  for (const id of game.state.board) {
    const tile = game.state.tiles[id];
    let node = boardNodes.get(id);
    const existed = !!node;
    if (!node) {
      node = document.createElement("button");
      node.type = "button";
      node.className = "tile board-tile";
      node.dataset.id = String(id);
      node.style.cssText = `left:${(tile.x / BOARD_WIDTH) * 100}%;top:${(tile.y / boardHeight(game.state.level)) * 100}%;z-index:${10 + tile.z * 3};--deal-delay:${Math.min(id * 10, 300)}ms`;
      boardNodes.set(id, node);
      additions.append(node);
    }
    if (node.dataset.kind !== String(tile.kind)) {
      node.dataset.kind = String(tile.kind);
      node.innerHTML = art(tile.kind);
    }
    const enabled = available.has(id);
    const uncovered = existed && node.disabled && enabled && !entrance;
    node.disabled = !enabled;
    node.classList.toggle("available", enabled);
    node.classList.toggle("covered", !enabled);
    if (!enabled) node.classList.remove("just-uncovered");
    else if (uncovered) node.classList.add("just-uncovered");
    node.setAttribute("aria-label", `${KINDS[tile.kind].name}${enabled ? "" : "，被上层遮挡"}`);
  }
  if (additions.childNodes.length) board.append(additions);
  board.classList.toggle("dealing", entrance);
  element("board-empty").hidden = !!game.state.board.length;
}
element("board").addEventListener("animationend", (event) => {
  if (event.animationName === "uncover")
    (event.target as Element).classList.remove("just-uncovered");
});
function renderTray(ids = game.state.tray) {
  const tray = element("tray");
  const nodes = new Map(
    [...tray.querySelectorAll<HTMLButtonElement>(".tray-tile")].map((node) => [
      Number(node.dataset.id), node,
    ]),
  );
  for (const [id, node] of nodes) if (!ids.includes(id)) node.remove();
  ids.forEach((id, index) => {
    const tile = game.state.tiles[id];
    let node = nodes.get(id);
    if (!node) {
      node = document.createElement("button");
      node.type = "button";
      node.className = "tile tray-tile";
      node.dataset.id = String(id);
      node.disabled = true;
    }
    if (node.dataset.kind !== String(tile.kind)) {
      node.dataset.kind = String(tile.kind);
      node.innerHTML = art(tile.kind);
      node.setAttribute("aria-label", KINDS[tile.kind].name);
    }
    node.style.visibility = "";
    if (tray.children[index] !== node)
      tray.insertBefore(node, tray.children[index] ?? null);
  });
}
function renderReserve() {
  const reserve = element("reserve");
  reserve.hidden = !game.state.reserve.length;
  reserve.innerHTML = `<span>暂存小站<small>点击即可取回</small></span><div>${game.state.reserve.map((id) => tileHTML(id, "reserve-tile")).join("")}</div>`;
}

function updateStats() {
  const state = game.state;
  const config = LEVELS[state.level];
  element("level-tag").textContent =
    mode === "daily"
      ? `${currentDay.slice(5).replace("-", "月")}日 · 每日挑战`
      : `第 ${String(state.level + 1).padStart(2, "0")} 关`;
  element("level-name").textContent =
    mode === "daily" ? "今日牧场来信" : config.name;
  element("remaining-count").innerHTML =
    `${icon("leaf")}<b>${state.board.length + state.tray.length + state.reserve.length}</b> / ${state.tiles.length}`;
  const percent = Math.round((state.cleared / state.tiles.length) * 100);
  element("level-progress").style.width = `${percent}%`;
  document
    .querySelector(".progress-track")!
    .setAttribute("aria-valuenow", String(percent));
  element("tray-count").innerHTML = `${state.tray.length}<span> / 7</span>`;
  element("rack").classList.toggle("danger", state.tray.length >= 5);
  element("tray-message").innerHTML =
    state.tray.length >= 5
      ? `${icon("heart")}<span>空间不多啦，仔细想一想</span>`
      : `${icon("leaf")}<span>三张一样，就会有好事发生</span>`;
  element("board-hint").textContent = state.reserve.length
    ? "暂存小站里的牌也要一起消除哦"
    : state.moves === 0
      ? "点击亮着的牌，试着凑齐三张"
      : state.tray.length >= 5
        ? "试着找已有的同类牌，或使用小帮手"
        : `已收集 ${state.cleared / 3} 份小美好 · ${state.moves} 次点击`;
  element("strategy-tip").innerHTML =
    state.tray.length >= 5
      ? "位置有点紧张？<br>先找已经成对的牌，<br>小帮手也在等你。"
      : state.cleared > state.tiles.length / 2
        ? "已经走过一大半啦。<br>别忘了看看下面，<br>好消息就在前方。"
        : "先观察，再点击。<br>给下一份小美好，<br>留一点位置。";
  const disabled: Record<string, boolean> = {
    undo: !game.canUndo(),
    remove:
      !state.tools.remove ||
      !state.tray.length ||
      !!state.reserve.length ||
      state.status === "won",
    shuffle:
      !state.tools.shuffle || !state.board.length || state.status !== "playing",
  };
  (["remove", "undo", "shuffle"] as const).forEach((tool) => {
    const button = element<HTMLButtonElement>(`tool-${tool}`);
    button.disabled = busy || disabled[tool];
    button.querySelector(".tool-count")!.textContent = String(
      state.tools[tool],
    );
    button.classList.toggle("used", !state.tools[tool]);
  });
  element("journey-count").textContent = `${progress.completed.length} / 10`;
  element("journey-dots").innerHTML = LEVELS.map(
    (_, i) =>
      `<span class="${progress.completed.includes(i) ? "completed" : i === currentLevel && mode === "journey" ? "current" : ""}"></span>`,
  ).join("");
  element("journey-nav").classList.toggle("active", mode === "journey");
  element("daily-nav").classList.toggle("active", mode === "daily");
  element("daily-invite-copy").textContent = progress.daily[shanghaiDate()]
    ? "今日已收集，明天再来看看"
    : "每天一份专属小挑战";
  element("board").setAttribute("aria-busy", String(busy));
}

function render(entrance = false) {
  renderBoard(entrance);
  renderTray();
  renderReserve();
  updateStats();
}
function persist() {
  if (!saveProgress(progress))
    toast("浏览器暂时无法保存进度，本次仍可正常游玩");
}
function toast(message: string) {
  clearTimeout(toastTimeout);
  const node = element("toast");
  node.textContent = message;
  node.classList.add("visible");
  toastTimeout = setTimeout(() => node.classList.remove("visible"), 3200);
}
function showDialog(html: string, setup?: () => void) {
  element("modal-content").innerHTML = html;
  if (!modal.open) modal.showModal();
  setup?.();
}
function closeDialog() {
  modal.close();
}
// Native dialog focus restoration runs before the asynchronous close event.
// Repeating it in that event can steal focus from a card the player has just selected.
element("modal-close").addEventListener("click", closeDialog);
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    const r = modal.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      closeDialog();
  }
});

async function pick(id: number, keyboardInput = false) {
  if (busy || game.state.status !== "playing") return;
  const source = document.querySelector<HTMLElement>(
    `.board-tile[data-id="${id}"], .reserve-tile[data-id="${id}"]`,
  );
  if (!source) return;
  const sourceRect = source.getBoundingClientRect();
  const sourceMarkup = source.innerHTML;
  const before = reducedMotion
    ? new Map<number, DOMRect>()
    : rectangles(".tray-tile");
  const intermediate = [...game.state.tray];
  const kind = game.state.tiles[id].kind;
  const last = intermediate.findLastIndex(
    (tid) => game.state.tiles[tid].kind === kind,
  );
  intermediate.splice(last < 0 ? intermediate.length : last + 1, 0, id);
  const result = game.pick(id);
  if (!result.accepted) return;
  busy = true;
  let flyer: HTMLElement | undefined;
  try {
    renderBoard();
    renderReserve();
    audio.play("pick");
    if (!reducedMotion && !document.hidden) {
      renderTray(intermediate);
      updateStats();
      flip(before, ".tray-tile");
      const target = document.querySelector<HTMLElement>(
        `.tray-tile[data-id="${id}"]`,
      )!;
      const targetRect = target.getBoundingClientRect();
      target.style.visibility = "hidden";
      flyer = document.createElement("div");
      flyer.className = "tile flying-tile";
      flyer.innerHTML = sourceMarkup;
      flyer.style.cssText = `left:${sourceRect.left}px;top:${sourceRect.top}px;width:${sourceRect.width}px;height:${sourceRect.height}px;`;
      element("effects").append(flyer);
      const dx = targetRect.left - sourceRect.left;
      const dy = targetRect.top - sourceRect.top;
      await animate(
        flyer,
        [
          { transform: "translate(0,0) scale(1)", rotate: "0deg" },
          {
            transform: `translate(${dx * 0.35}px,${dy * 0.22 - 35}px) scale(1.12)`,
            rotate: dx > 0 ? "7deg" : "-7deg",
            offset: 0.32,
          },
          {
            transform: `translate(${dx}px,${dy}px) scale(${targetRect.width / sourceRect.width})`,
            rotate: "0deg",
          },
        ],
        300,
        "cubic-bezier(.25,.7,.3,1)",
      );
      flyer.remove();
      target.style.visibility = "";
      void animate(
        target,
        [
          { transform: "scale(1.08,.94)" },
          { transform: "scale(.97,1.04)" },
          { transform: "scale(1)" },
        ],
        200,
      );
      if (result.matched.length) {
        await pause(75);
        const nodes = result.matched.map((tid) =>
          document.querySelector<HTMLElement>(`.tray-tile[data-id="${tid}"]`)!,
        );
        const center = nodes[1].getBoundingClientRect();
        audio.play("match");
        particles(center.x + center.width / 2, center.y + center.height / 2);
        await Promise.all(
          nodes.map((node) => {
            const rect = node.getBoundingClientRect();
            return animate(
              node,
              [
                { transform: "translateX(0) scale(1)", opacity: 1 },
                {
                  transform: `translateX(${(center.x - rect.x) * 0.22}px) scale(1.12)`,
                  opacity: 1,
                  offset: 0.35,
                },
                {
                  transform: `translateX(${center.x - rect.x}px) scale(.1)`,
                  opacity: 0,
                },
              ],
              280,
            );
          }),
        );
        const old = rectangles(".tray-tile");
        renderTray();
        flip(old, ".tray-tile");
        void animate(
          element("rack"),
          [
            { transform: "scale(1)" },
            { transform: "scale(1.012)", offset: 0.4 },
            { transform: "scale(1)" },
          ],
          260,
        );
      }
    } else if (result.matched.length) {
      audio.play("match");
    }
  } catch (error) {
    console.warn(
      "Card presentation interrupted; restoring the committed move.",
      error,
    );
  } finally {
    flyer?.remove();
    busy = false;
    // The engine commits first. Always reconcile the visible tray and release
    // input, including after a hidden tab, animation error or canceled timeline.
    renderTray();
    updateStats();
  }
  const status = game.state.status as GameState["status"];
  if (
    keyboardInput &&
    status === "playing" &&
    document.activeElement === document.body
  ) {
    const distance = (node: HTMLElement) => {
      const rect = node.getBoundingClientRect();
      return (rect.x - sourceRect.x) ** 2 + (rect.y - sourceRect.y) ** 2;
    };
    [
      ...document.querySelectorAll<HTMLElement>(
        ".board-tile.available, .reserve-tile",
      ),
    ]
      .sort((a, b) => distance(a) - distance(b))[0]
      ?.focus({ preventScroll: true });
  }
  if (status === "won") await onWin();
  else if (status === "lost") onLost();
}

element("board").addEventListener("click", (event) => {
  const tile = (event.target as Element).closest<HTMLElement>(".available");
  if (tile) void pick(Number(tile.dataset.id), event.detail === 0);
});
element("reserve").addEventListener("click", (event) => {
  const tile = (event.target as Element).closest<HTMLElement>(".reserve-tile");
  if (tile) void pick(Number(tile.dataset.id), event.detail === 0);
});

async function useTool(tool: "remove" | "undo" | "shuffle") {
  if (busy) return;
  if (tool === "shuffle") {
    if (!game.shuffle()) {
      toast("先用「挪一挪」或「想一想」腾出空间，再洗牌吧");
      return;
    }
    busy = true;
    try {
      updateStats();
      audio.play("tool");
      await Promise.all(
        [...document.querySelectorAll(".board-tile")].map((node, i) =>
          animate(
            node,
            [
              { transform: "translate(0,0) rotateY(0deg)", opacity: 1 },
              {
                transform: `translate(${i % 2 ? 8 : -8}px,-12px) rotateY(90deg)`,
                opacity: 0.3,
              },
            ],
            170,
          ),
        ),
      );
      renderBoard();
      await Promise.all(
        [...document.querySelectorAll(".board-tile")].map((node) =>
          animate(
            node,
            [
              { transform: "rotateY(-90deg)", opacity: 0.3 },
              { transform: "rotateY(0deg)", opacity: 1 },
            ],
            250,
          ),
        ),
      );
    } catch (error) {
      console.warn(
        "Shuffle presentation interrupted; restoring the committed board.",
        error,
      );
    } finally {
      busy = false;
      renderBoard();
      updateStats();
    }
    toast("新牌面已准备好，继续寻找小美好");
  } else {
    const before = rectangles(".tray-tile");
    if (!(tool === "undo" ? game.undo() : game.remove())) return;
    audio.play("tool");
    render();
    flip(before, ".tray-tile");
    if (tool === "remove") toast("三张牌已移到暂存小站，记得取回消除");
    else toast("回到上一步，换个想法再试试");
  }
}
(["remove", "undo", "shuffle"] as const).forEach((tool) =>
  element(`tool-${tool}`).addEventListener("click", () => void useTool(tool)),
);

function startLevel(level: number, nextMode: "journey" | "daily" = "journey") {
  if (busy) return;
  closeDialog();
  mode = nextMode;
  currentDay = shanghaiDate();
  currentLevel = level;
  game = new Game(
    nextMode === "daily" ? 7 : level,
    nextMode === "daily" ? dailySeed(currentDay) : undefined,
  );
  render(true);
  if (nextMode === "daily") toast(`${currentDay} 的牧场来信，每天都是新的牌局`);
}

function showLevels() {
  const unlocked = Math.min(
    9,
    Array.from({ length: 10 }, (_, i) => i).find(
      (i) => !progress.completed.includes(i),
    ) ?? 9,
  );
  showDialog(
    `<span class="modal-eyebrow">YOUR LITTLE JOURNEY</span><h2 id="modal-title">去牧场走走</h2><p class="modal-intro">走过的每一步，都会开出小小的花。</p><div class="levels-grid">${LEVELS.map(
      (level, i) => {
        const complete = progress.completed.includes(i);
        const locked = i > unlocked;
        return `<button class="level-choice ${complete ? "complete" : ""}" data-level="${i}" ${locked ? "disabled" : ""}><span class="level-number">${locked ? icon("lock") : String(i + 1).padStart(2, "0")}</span><strong>${level.name}</strong><small>${complete ? `${icon("check")} 已收集` : locked ? "等待前一关解锁" : "新的小美好"}</small></button>`;
      },
    ).join(
      "",
    )}</div><p class="dialog-footnote">进度保存在当前浏览器 · 不需要登录</p>`,
    () => {
      document
        .querySelectorAll<HTMLButtonElement>("[data-level]")
        .forEach((button) =>
          button.addEventListener("click", () =>
            startLevel(Number(button.dataset.level)),
          ),
        );
    },
  );
}

function showCollection() {
  showDialog(
    `<span class="modal-eyebrow">THE MEADOW COLLECTION</span><h2 id="modal-title">小美好图鉴</h2><p class="modal-intro">十二位牧场老朋友，等你把它们三三凑成群。</p><div class="collection-grid">${KINDS.map((kind, i) => `<div class="collection-item"><span class="collection-art">${art(i)}</span><strong>${kind.name}</strong><small>NO. ${String(i + 1).padStart(2, "0")}</small></div>`).join("")}</div>`,
  );
}

function showHelp() {
  showDialog(
    `<span class="modal-eyebrow">TAKE YOUR TIME</span><h2 id="modal-title">一点点牧场指南</h2><div class="help-steps"><p><b>01</b><span><strong>找三张一样的</strong>点击没有被遮挡的亮牌，放进下方卡槽；三张相同的牌会自动消除。</span></p><p><b>02</b><span><strong>给惊喜留点位置</strong>卡槽只有七格。放入第七张后若不能消除，本次挑战就结束啦。</span></p><p><b>03</b><span><strong>需要时，找小帮手</strong>挪出三张、撤回一步、重新洗牌，每关各一次。暂存小站里的牌也要取回消除。</span></p><p><b>04</b><span><strong>慢慢走，也可以走很远</strong>清空棋盘、卡槽与暂存小站即可通关。每日挑战按北京时间每天更新，同一天的初始牌局相同。</span></p></div><div class="settings-row"><span>${icon("sound")}游戏音效<small>轻轻的木琴声</small></span><button id="sound-setting" class="switch ${audio.enabled ? "on" : ""}" role="switch" aria-checked="${audio.enabled}" aria-label="游戏音效"><i></i></button></div><div class="settings-row"><span>${icon("leaf")}减少动态效果<small>${motionPreference.matches ? "系统已启用减少动画" : "保留每份美好，减少飞行与粒子"}</small></span><button id="motion-setting" class="switch ${progress.reducedMotion ? "on" : ""}" role="switch" aria-checked="${progress.reducedMotion}" aria-label="减少动态效果"><i></i></button></div><p class="dialog-footnote">原创牧场三消 · 无广告 · 无倒计时 · 进度保存在本机</p>`,
    () => {
      element("sound-setting").addEventListener("click", () => {
        toggleSound();
        element("sound-setting").classList.toggle("on", audio.enabled);
        element("sound-setting").setAttribute(
          "aria-checked",
          String(audio.enabled),
        );
      });
      element("motion-setting").addEventListener("click", () => {
        progress.reducedMotion = !progress.reducedMotion;
        setReducedMotion(progress.reducedMotion || motionPreference.matches);
        persist();
        element("motion-setting").classList.toggle(
          "on",
          progress.reducedMotion,
        );
        element("motion-setting").setAttribute(
          "aria-checked",
          String(progress.reducedMotion),
        );
      });
    },
  );
}

function confirmRestart() {
  if (busy) return;
  if (!game.state.moves) {
    startLevel(currentLevel, mode);
    toast("新的一局准备好啦");
    return;
  }
  showDialog(
    `<div class="dialog-illustration">${sheep()}</div><span class="modal-eyebrow">A FRESH LITTLE START</span><h2 id="modal-title">重新散个步？</h2><p class="modal-intro">本局进度会重新开始，<br>已经收集的牧场足迹会为你保留。</p><button class="primary-button" id="confirm-restart">重新开始 ${icon("reset")}</button><button class="text-button" id="cancel-restart">再想一想，继续这局</button>`,
    () => {
      element("confirm-restart").addEventListener("click", () =>
        startLevel(currentLevel, mode),
      );
      element("cancel-restart").addEventListener("click", closeDialog);
    },
  );
}

async function onWin() {
  const finishedGame = game;
  const state = game.state;
  if (mode === "journey") {
    if (!progress.completed.includes(currentLevel))
      progress.completed.push(currentLevel);
    progress.bestMoves[currentLevel] = Math.min(
      progress.bestMoves[currentLevel] ?? Infinity,
      state.moves,
    );
  } else
    progress.daily[currentDay] = Math.min(
      progress.daily[currentDay] ?? Infinity,
      state.moves,
    );
  persist();
  updateStats();
  audio.play("win");
  const card = document.querySelector(".game-card")!.getBoundingClientRect();
  particles(card.x + card.width / 2, card.y + card.height / 2, true);
  await pause(450);
  if (game !== finishedGame || modal.open) return;
  showDialog(
    `<div class="dialog-illustration win-sheep">${sheep()}</div><span class="modal-eyebrow">GOOD THINGS COME IN THREES</span><h2 id="modal-title">好心情，收集成功！</h2><p class="modal-intro">${mode === "daily" ? "今天的牧场来信，已经被你温柔拆开。" : currentLevel === 9 ? "十段牧场时光，都变成了你的好心情。" : "又一份小美好，变成了你的牧场足迹。"}</p><div class="win-stats"><div><b>${state.cleared / 3}</b><span>份小美好</span></div><div><b>${state.moves}</b><span>次用心选择</span></div><div><b>${3 - Object.values(state.tools).reduce((a, b) => a + b, 0)}</b><span>次小帮手</span></div></div><button class="primary-button" id="next-level">${mode === "journey" && currentLevel < 9 ? "去下一片牧场" : "回牧场逛逛"} ${icon("arrow")}</button><button class="text-button" id="replay-level">再收集一次小美好</button>`,
    () => {
      element("next-level").addEventListener("click", () => {
        if (mode === "journey" && currentLevel < 9)
          startLevel(currentLevel + 1);
        else showLevels();
      });
      element("replay-level").addEventListener("click", () =>
        startLevel(currentLevel, mode),
      );
    },
  );
}

function onLost() {
  audio.play("fail");
  showDialog(
    `<div class="dialog-illustration">${sheep()}</div><span class="modal-eyebrow">THERE IS ALWAYS ANOTHER WAY</span><h2 id="modal-title">换条小路，再走走</h2><p class="modal-intro">小口袋暂时装满啦。<br>下一次，给还没出现的惊喜留点位置。</p>${game.state.tools.remove && !game.state.reserve.length ? '<button class="primary-button" id="rescue-remove">挪出三张，继续探索</button>' : game.canUndo() ? '<button class="primary-button" id="rescue-undo">撤回一步，再想一想</button>' : ""}<button class="${(game.state.tools.remove && !game.state.reserve.length) || game.canUndo() ? "secondary-button" : "primary-button"}" id="retry-level">再出发一次 ${icon("reset")}</button><button class="text-button" id="lost-levels">去看看牧场地图</button>`,
    () => {
      document
        .getElementById("rescue-remove")
        ?.addEventListener("click", () => {
          closeDialog();
          void useTool("remove");
        });
      document.getElementById("rescue-undo")?.addEventListener("click", () => {
        closeDialog();
        void useTool("undo");
      });
      element("retry-level").addEventListener("click", () =>
        startLevel(currentLevel, mode),
      );
      element("lost-levels").addEventListener("click", showLevels);
    },
  );
}

function updateSoundButton() {
  const button = element("sound-toggle");
  button.innerHTML = icon(audio.enabled ? "sound" : "muted");
  button.setAttribute("aria-label", audio.enabled ? "关闭声音" : "开启声音");
  button.setAttribute("aria-pressed", String(audio.enabled));
}
function toggleSound() {
  audio.enabled = !audio.enabled;
  progress.sound = audio.enabled;
  persist();
  updateSoundButton();
  if (audio.enabled) {
    void audio.unlock();
    audio.play("tool");
  }
}
element("sound-toggle").addEventListener("click", toggleSound);
element("help-button").addEventListener("click", showHelp);
element("restart-button").addEventListener("click", confirmRestart);
element("journey-nav").addEventListener("click", showLevels);
element("levels-button").addEventListener("click", showLevels);
element("daily-nav").addEventListener("click", () => {
  if (!busy) startLevel(7, "daily");
});
element("daily-invite").addEventListener("click", () => {
  if (!busy) startLevel(7, "daily");
});
element("collection-nav").addEventListener("click", showCollection);
document.querySelector(".brand")!.addEventListener("click", (event) => {
  event.preventDefault();
  showLevels();
});

// A stale daily board must never save a result under a different day's seed.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && mode === "daily" && shanghaiDate() !== currentDay)
    toast("新一天的来信已到。当前牌局仍记在开始挑战的日期。");
});

render(true);
updateSoundButton();
// Read-only observability for deterministic browser regression tests; no gameplay bypasses.
Object.defineProperty(window, "__MEADOW__", {
  value: {
    getState: (): GameState => structuredClone(game.state),
    isBusy: () => busy,
    getMode: () => mode,
  },
  writable: false,
});
