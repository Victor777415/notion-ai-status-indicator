# Chrome Web Store 上架素材（草案）

> 本文件汇总上架所需的文案与清单；二进制素材（图标、截图）待补。

## 基本信息

- **名称**：Notion AI 对话完成指示器
- **英文名（可选）**：Notion AI Task Indicator
- **版本**：0.1.0
- **类别**：生产力（Productivity）
- **语言**：简体中文（可后续加 English）

## 简短描述（≤132 字符）

在 Notion AI 网页版显示对话状态（思考/输出/完成），完成时弹系统通知，跨窗口也能收到提醒。

## 详细描述

Notion AI 对话完成指示器 是一个轻量浏览器扩展，帮你盯住 Notion AI 的长任务：

【它做什么】
• 在 Notion 页面右下角显示一个状态「宠物」：🐾 空闲 / 🤔 思考中 / ✍️ 输出中 / ✅ 完成。
• AI 回复完成时，弹出系统通知——即使你切到别的窗口或应用也能第一时间知道。
• 工具栏图标角标实时显示运行/完成状态；多个标签页同时跑任务会自动聚合计数。
• 宠物浮层可拖动，位置自动记忆。

【适合谁】
经常让 Notion AI 跑较长的写作、总结、检索任务，又不想干等着盯屏幕的人。

【隐私】
纯本地运行，不收集、不上传任何数据；只在 Notion 官方域名（app.notion.com / notion.so）上工作。隐私政策见仓库 docs/PRIVACY.md。

【开源】
代码完全开源：https://github.com/Victor777415/notion-ai-status-indicator

## 单一用途说明（Single Purpose）

本扩展的单一用途：在 Notion AI 网页版中指示对话任务状态并在完成时提醒用户。

## 权限用途说明（供商店审核填写）

- notifications：任务完成时向用户弹出系统通知。
- storage：在本地保存宠物浮层的位置。
- offscreen：在 MV3 下播放完成提示音（后台 worker 无法直接播放音频）。
- 主机权限 app.notion.com / *.notion.so：仅为在 Notion 页面注入状态检测与宠物界面。

## 数据用途申报（Data usage）

- 不收集任何用户数据（No user data collected）。
- 不出售/转让数据；不用于与单一用途无关的用途；不用于判定信用资质。

## 待补素材清单（依赖二进制，当前跳过）

- [ ] 商店图标 128×128（icon-128.png）
- [ ] 扩展图标 16/48/128（工具栏 & 管理页）
- [ ] 至少 1 张、建议 3–5 张截图（1280×800 或 640×400）
- [ ] （可选）小型宣传图 440×280
- [ ] （可选）提示音 ding.mp3

## 上架前技术检查

- [x] manifest 权限已收敛（notifications/storage/offscreen + 仅 Notion host）
- [ ] manifest 加入 icons 字段（依赖图标素材）
- [ ] 隐私政策 URL（可指向仓库 docs/PRIVACY.md 或 GitHub Pages）
- [ ] 用打包的 zip 在干净 profile 里 Load unpacked 跑通一次
