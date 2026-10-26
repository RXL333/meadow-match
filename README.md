# 羊咩咩 · Meadow Match

在一小片温柔牧场里，收集三份小美好。一个面向桌面和手机浏览器的原创叠层三消游戏。

[在线游玩](https://rxl333.github.io/meadow-match/)

## 游玩

点击没有被遮挡的牌，将它放进7格卡槽。三张同类自动消除；第7张放入后无法消除则失败。清空棋盘、卡槽和暂存小站即可通关。

- 10个逐步增加难度的牧场关卡，以及按北京时间每天更新的固定种子每日挑战。
- 紧密相连的七列底牌、跨格错位的局部叠牌、两个角落的深堆；随关卡逐步增加行数与叠层，揭开下层牌时有轻微提示。
- 挪一挪：将卡槽前三张移到暂存小站；这些牌需要再点击取回并消除。
- 想一想：恢复上一张牌操作前的完整状态，包括被消除的三张牌。
- 换一换：保留牌的种类与数量，重排棋盘牌面；重排结果带合法解法。卡槽已形成无法救回的状态时不消耗道具。
- 道具每关各一次。无广告、无登录、无倒计时；关卡进度与设置保存在当前浏览器。
- 支持键盘、音效开关和减少动画；尊重系统的减少动画设置。
- 支持快速连续点选：不同卡牌同时飞入卡槽，三消期间仍可继续选牌；同一张牌不会被重复取走。

## 本地开发

需要 Node.js 24 和 npm。

```text
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

正式构建在 `dist/`。`npm run preview` 可检查生产构建。Vite 使用相对资源路径，支持 GitHub Pages 仓库子目录。

## 发布

推送到 `main` 后，`.github/workflows/deploy.yml` 会执行规则测试、生产构建、Chromium浏览器测试，然后部署 GitHub Pages。仓库 Pages 发布源应设置为 GitHub Actions。

## 技术和美术

TypeScript + Vite；CSS与Web Animations API负责飞行、落位、聚合消除和庆祝粒子；Web Audio合成轻音乐音效。纯逻辑引擎位于 `src/game.ts`，不依赖渲染框架。`src/basket.ts`独立管理并行飞行和三消反馈，逻辑按输入顺序即时提交。牌区与卡槽复用已有DOM节点，动画有独立截止时间与后台清理，游戏状态不依赖动画成功；粒子数量设有上限。

牧场背景和12种牌面由内置图像生成工具原创生成，原始PNG保存在 `art-source/`，网页使用压缩后的WebP。角色、标识和辅助图标为项目内SVG。生成记录见 [美术记录](docs/art-direction.md)。本地子集字体 Noto Serif SC 使用 SIL Open Font License，许可证保存在 `public/fonts/OFL.txt`。

本项目提供客户端本地成绩，不包含在线排行、账号同步、支付或微信平台接口。
