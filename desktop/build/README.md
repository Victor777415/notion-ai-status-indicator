# 打包图标目录

把应用图标放在这里，命名为 `icon.png`（建议 **1024×1024** 像素、不小于 512×512）。

- macOS 打包时 electron-builder 会自动把 `icon.png` 转成 `.icns`。
- 若本目录缺 `icon.png`，依然能打包，只是使用 Electron 默认图标（会有一条警告，无害）。
- 本仓库已有的 `assets/icon-128.png` 太小，不适合直接做 app 图标；请用 1024 的版本。
