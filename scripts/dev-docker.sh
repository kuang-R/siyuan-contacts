#!/usr/bin/env bash
#
# dev-docker.sh — 开发模式：监听文件变更，自动构建并部署到 Docker 思源容器
#
# 用法:
#   ./scripts/dev-docker.sh [--container siyuan] [--host-path ~/siyuan/data]
#
# 依赖: fswatch (macOS) 或 inotifywait (Linux)

set -euo pipefail

CONTAINER="${SIYUAN_CONTAINER:-siyuan}"
HOST_PATH="${SIYUAN_HOST_PATH:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --container) CONTAINER="$2"; shift 2 ;;
    --host-path) HOST_PATH="$2"; shift 2 ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_SCRIPT="$SCRIPT_DIR/deploy-docker.sh"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}[DEV]${NC} 启动开发模式……"
echo -e "${CYAN}[DEV]${NC} 容器: $CONTAINER"
echo -e "${CYAN}[DEV]${NC} 监听 src/ 目录变更..."
echo ""

# 初始构建
echo -e "${CYAN}[DEV]${NC} 初始构建..."
( cd "$(dirname "$SCRIPT_DIR")" && npm run build )
bash "$DEPLOY_SCRIPT" --skip-build

# 部署参数
DEPLOY_ARGS="--skip-build"
[ -n "$HOST_PATH" ] && DEPLOY_ARGS="$DEPLOY_ARGS --host-path $HOST_PATH"
[ -n "$CONTAINER" ] && DEPLOY_ARGS="$DEPLOY_ARGS --container $CONTAINER"

deploy() {
  echo -e "\n${CYAN}[DEV]${NC} 检测到变更，重新部署..."
  bash "$DEPLOY_SCRIPT" $DEPLOY_ARGS
  echo -e "${GREEN}[DEV]${NC} 部署完成，等待下一次变更...\n"
}

# 检测文件变更工具
if command -v inotifywait &>/dev/null; then
  # Linux
  echo -e "${CYAN}[DEV]${NC} 使用 inotifywait 监听..."
  while true; do
    inotifywait -r -e modify,create,delete \
      --exclude 'node_modules|dist|.git' \
      "$(dirname "$SCRIPT_DIR")/src" \
      "$(dirname "$SCRIPT_DIR")/i18n" \
      2>/dev/null
    sleep 0.5  # 防抖
    deploy
  done
elif command -v fswatch &>/dev/null; then
  # macOS
  echo -e "${CYAN}[DEV]${NC} 使用 fswatch 监听..."
  fswatch -o \
    --exclude 'node_modules' --exclude 'dist' --exclude '.git' \
    "$(dirname "$SCRIPT_DIR")/src" \
    "$(dirname "$SCRIPT_DIR")/i18n" \
    | while read -r _; do
      sleep 0.5
      deploy
    done
else
  echo "错误：未找到 inotifywait (Linux) 或 fswatch (macOS)" >&2
  echo "安装: apt install inotify-tools  或  brew install fswatch" >&2
  exit 1
fi
