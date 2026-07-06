#!/bin/bash
# 双击本文件即可启动 Notion AI 桌面伴侣。
# 首次使用需先在终端执行一次赋予可执行权限：
#   chmod +x 启动桌面伴侣.command

cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "首次运行，正在安装依赖（已配国内镜像）…"
  npm install || { echo "依赖安装失败，请手动运行 npm install 查看错误。"; exit 1; }
fi

echo "启动 Notion AI 桌面伴侣…（关闭本终端窗口即退出）"
npm start
