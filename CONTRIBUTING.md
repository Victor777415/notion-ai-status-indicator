# 本地开发指南（Contributing）

本项目是纯 MV3 浏览器扩展，**无构建步骤**（不需要 npm / webpack），改完源码直接在 Chrome 里刷新即可生效。

## 环境准备

- Chrome 116+（需要 content script 的 `world: "MAIN"` 与 offscreen 支持）
- git（可选；也可直接在 GitHub 上 Download ZIP）

## 拉取代码

```bash
git clone https://github.com/Victor777415/notion-ai-status-indicator.git
cd notion-ai-status-indicator
```

## 加载扩展（本地调试）

1. Chrome 打开 `chrome://extensions`
2. 右上角开启 **开发者模式**
3. 点 **加载已解压的扩展程序**，选本仓库根目录（含 `manifest.json`）
4. 改完代码后，回该页面点扩展卡片上的 **刷新 ↻** 即可生效

> content script 改动：刷新扩展 + 重新加载 notion.so 页面；service worker 改动：点刷新即可。

## 调试位置

- **content / interceptor**：在 notion.so 页面的 DevTools Console 看 `[NAI-Indicator]` 日志
- **service worker**：`chrome://extensions` → 该扩展 → 点“Service Worker”链接打开专属 DevTools
- **offscreen**：同上，offscreen 文档的日志

## 目录结构

见 `README.md` 的「目录结构」一节。

## 提交回仓库

```bash
git checkout -b feat/your-change      # 建分支（可选，也可直接在 main 上改）
git add -A
git commit -m "feat: 简述改动"
git push origin feat/your-change      # 或 git push origin main
```

- 走分支：在 GitHub 上开 Pull Request 合入 `main`。
- 直接改 `main`：`git push origin main` 即可。

## 约定

- 决策 / 方案 / 关键取舍以 **Notion 项目页为唯一事实源**，代码仓库只做同步与执行。
- 状态协议（`src/shared/protocol.js`）是 content ↔ background 的契约，改动需同步双方。
- 待补二进制素材见 `assets/README.md`。
