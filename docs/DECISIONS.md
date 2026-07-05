# 决策记录（Decision Log）

> **AI 对话完成指示器** —— Notion AI 任务状态 & 完成提示扩展。
> 本文件是本项目「决策与理由 + 里程碑历史」的事实源；代码见仓库其余部分，逐步进展与验证见各 commit 与 issue/PR。

---

## 一、目标

做一个 **MV3 浏览器扩展**，用于 Notion AI 网页版：

- **检测** 当前 AI 对话任务状态：思考中（thinking）/ 输出中（responding）/ 完成（done）。
- **展示** 一个页面内浮动「宠物」，随状态切换表情/动画。
- **提示** 任务完成时通过系统通知跨窗口提醒用户（即使切到别的 App 也能收到）。

## 二、方案（已定：纯扩展）

全部逻辑落在浏览器沙箱内，不引入任何原生 / 本地化组件，保证可上架 Chrome Web Store、代码单仓库、易迁移。

```text
content script（注入 Notion 页面）
  ├─ 复用归档器 fetch 拦截 → 状态机 idle→thinking→responding→done
  ├─ 渲染页面内浮动宠物（可拖动、记忆位置）
  └─ 上报状态 →
background service worker
  ├─ 聚合多标签状态
  ├─ chrome.notifications 弹系统通知（跨窗口、后台可达）
  └─ 更新工具栏图标角标（运行中 / 完成）
offscreen document
  └─ 播放完成提示音（MV3 worker 不能直接放音频）
```

**三块要点**

1. **状态检测（命门）**：认准 AI 流式接口 `POST /api/v3/runInferenceTranscript` —— 请求发出=`thinking`，首个 token=`responding`，流关闭/结束=`done`；DOM 扴取仅作兜底。
2. **页面内宠物**：content script 透明浮层，绝对定位在角落，可拖动，位置存 `chrome.storage`。UI 常驻 content script，**不放 service worker**。
3. **跨窗口提醒**：`chrome.notifications` + 图标角标；声音走 offscreen document。

## 三、约束

- **可发布 / 易迁移优先**：后续要上架 Chrome Web Store 且代码进 GitHub → 禁止引入 native messaging、本地 WebSocket、原生桌宠等本地化内容。
- **放弃「悬浮在所有窗口之上」的桌面宠物**：浏览器沙箱物理限制，扩展画不出浏览器窗口之外的东西；跨窗口感知改由系统通知实现。
- **权限收敛**：`host_permissions` 限定 Notion 自家域名（`*://app.notion.com/*` 与 `*://*.notion.so/*`）；仅申请 `notifications` / `storage` / `offscreen`。不监听 Notion 以外的任何站点。

## 四、关键决策与取舍（含理由）

| # | 决策 | 取舍与理由 |
|---|------|-----------|
| 1 | **纯扩展**，而非「扩展 + 原生桌宠」 | 用户约束为可发布/易迁移优先；原生端无法上架、需双轨发布且本地化重。代价：宠物只在 Notion 页内可见，跨窗口靠系统通知补足。 |
| 2 | 状态检测以 **fetch 拦截** 为主，DOM 扴取仅兜底 | 拦截更稳、不随 Notion 改版崩；且可复用现有归档器拦截链。 |
| 3 | **不用 native messaging / 本地 WebSocket** | 这些是最重的本地化项，直接违背发布/迁移约束。 |
| 4 | 宠物 UI 放 **content script**，worker 只做通知/角标 | MV3 service worker 会休眠，UI 放 worker 会丢失。 |
| 5 | `host_permissions` / `matches` 覆盖 **app.notion.com**（保留 notion.so） | Notion 网页版实际域名已是 app.notion.com（notion.so 跳转过去）；不覆盖则 content script 不注入、检测不到。仍严格限定 Notion 自家域名，不越权。 |

## 五、里程碑

| 里程碑 | 内容 | 状态 |
|---|------|------|
| M1 | 状态检测验证（命门） | ✅ 已入库 `4dc5466` |
| M2 | 页面内宠物（浮层 + 动画 + 拖动记忆） | ✅ 已入库 `ccdbdb5` |
| M3 | 跨窗口完成通知（系统通知 + 角标 + 提示音） | ✅ 已入库 `1615e82` |
| M4 | 多标签聚合 + 打磨 | 🟡 待落库（本地 `2f12f8f`） |
| M5 | 上架流程：manifest/权限收敛、隐私说明、商店素材 | ⬜ 未开始 |

里程碑跟踪 issue：M1 #4、M2 #5、M3 #6、M4 #7、M5 #8。

## 六、执行日志

### 2026-07-02 · 仓库建档 + M1 骨架
- 仓库：GitHub 公开仓（README 已脱敏，不含个人信息）。
- 代码骨架（MV3）：`manifest.json` + `src/content`（interceptor 主世界 fetch 拦截 + content 宠物/状态机）+ `src/background`（service worker：通知/角标/聚合）+ `src/offscreen`（提示音）+ `src/shared/protocol.js`（状态协议）。
- 文档：`docs/M1-detection.md`、`assets/README.md`（待补图标/提示音素材）。
- 阻塞：Fine-grained PAT 无建仓权限 → 仓库由用户手动创建（已解决）；图标/提示音二进制素材待补。

### 2026-07-03 · 本地开发流程 + 委派执行
- 新增 `CONTRIBUTING.md`：本地开发（加载已解压扩展 + 刷新）与推回仓库流程；纯 MV3 无构建步骤。

### 2026-07-03 · M1 复测：域名岤路修复
- 发现：Notion 网页版实际域名为 app.notion.com；旧 `matches` 只含 `*://*.notion.so/*`，content script 未注入。
- 决策（已批准）：`host_permissions` 与 `content_scripts.matches` 增加 `*://app.notion.com/*`，保留 notion.so。已落地：manifest `4e68abe`、README `b83eb92`。

### 2026-07-03 · M1 收敛入库
- `AI_URL_HINTS` 收敛为完整路径段 `/api/v3/runinferencetranscript`，与误命中的 `markInferenceTranscriptSeen` / `getInferenceTranscriptsUnreadCount` 干净区分。
- 时序：thinking → 网络请求 → responding → done，`done` 与 lifecycle `keepalive:false` 基本同步，无误报。
- 入库：commit `4dc5466`（等价本地 `8118dd5`）。
- 环境岤路（非产品问题）：Chrome 149 拒绝 `--load-extension`、CRX 侧载被 `disable_reasons:[256]` 禁用；改用 CDP 将同一 `interceptor.js` 注入主世界验证逻辑。

### 2026-07-03 · M2 页面内宠物完成
- 交付：`src/content/content.js` + `src/content/pet.css`，commit `ccdbdb5`（等价本地 `029c269`）。
- 功能：监听 interceptor 广播，状态机 idle/thinking/responding/done，`done` 3s 回落；四态动画（含 reduced-motion、暗色适配）；拖动 + `chrome.storage.local` 持久化位置（localStorage 兜底）+ 越界钳制；`chrome.runtime.sendMessage` 上报 `NAI_STATE`。
- 自测（隔离 Chrome + CDP）：statePass / resetPass / dragPass / restorePass 全 true。

### 2026-07-03 · M3 跨窗口完成通知完成
- 交付：`src/background/service-worker.js` + `src/offscreen/offscreen.html` + `src/offscreen/offscreen.js`，commit `1615e82`（等价本地 `4210cb6`）。
- 功能：SW 收 `NAI_STATE` 按 tabId 维护状态；`非done→done` 才弹 `chrome.notifications`（点击聚焦对应窗口/标签，含去重）+ badge（运行 •、完成 ✓，5s 清）；tab 关闭清理；提示音经 offscreen（`hasDocument` 幂等创建，缺 `ding.mp3` 静默）。
- 自测（模拟 Chrome API）：done → notifications.create + badge •→✓ + offscreen `NAI_PLAY_SOUND` 触发；两 tab 分别 done 归属正确。
- 遗留：通知 iconUrl 指向未提供的 `assets/icon-128.png`（素材缺口，已优雅吞错）。

## 七、待办 / 遗留
- **M4 待落库**：本地 `2f12f8f feat(m4): add multi-tab badge aggregation`（改动 service-worker.js + content.js）。
- **二进制素材缺口**：`assets/` 缺 icon-16/48/128.png 与 ding.mp3；不阻塞 M4，但卡 M5 上架。

## 八、协作约定（仅本任务）
- **GitHub 为主**：代码、进展、决策、验证结果均以仓库为准。决策与理由记于本文件；自测与岤路记于对应 PR / issue。
- Notion 任务页仅作索引（当前状态 + 仓库链接），不再手抄进展。
