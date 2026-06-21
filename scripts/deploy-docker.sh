#!/usr/bin/env bash
#
# deploy-docker.sh — 将 siyuan-contacts 插件安装到 Docker 思源容器
#
# 用法:
#   ./scripts/deploy-docker.sh [OPTIONS]
#
# 选项:
#   --container NAME      Docker 容器名（默认: siyuan）
#   --workspace PATH      容器内工作空间路径（默认: /siyuan/workspace）
#   --host-path PATH      宿主机挂载路径，指定后直接复制到宿主机而非用 docker cp
#   --skip-build          跳过 npm run build，仅复制已有 dist/
#   --restart             安装后重启思源容器
#   -h, --help            显示帮助
#
# 环境变量（优先级低于命令行参数）:
#   SIYUAN_CONTAINER      Docker 容器名
#   SIYUAN_WORKSPACE      容器内工作空间路径
#   SIYUAN_HOST_PATH      宿主机挂载路径
#
# 示例:
#   ./scripts/deploy-docker.sh                                    # 默认配置安装
#   ./scripts/deploy-docker.sh --container siyuan-prod            # 指定容器
#   ./scripts/deploy-docker.sh --host-path ~/siyuan/data           # 直接文件复制
#   ./scripts/deploy-docker.sh --skip-build --restart              # 跳过构建，安装后重启

set -euo pipefail

# ============================================================================
# 默认配置
# ============================================================================
CONTAINER="${SIYUAN_CONTAINER:-siyuan}"
WORKSPACE="${SIYUAN_WORKSPACE:-/siyuan/workspace}"
HOST_PATH="${SIYUAN_HOST_PATH:-}"
SKIP_BUILD=false
RESTART=false

PLUGIN_NAME="siyuan-contacts"
PLUGIN_DIR="$WORKSPACE/data/plugins/$PLUGIN_NAME"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# ============================================================================
# 解析参数
# ============================================================================
while [[ $# -gt 0 ]]; do
  case "$1" in
    --container)
      CONTAINER="$2"; shift 2 ;;
    --workspace)
      WORKSPACE="$2"; shift 2 ;;
    --host-path)
      HOST_PATH="$2"; shift 2 ;;
    --skip-build)
      SKIP_BUILD=true; shift ;;
    --restart)
      RESTART=true; shift ;;
    -h|--help)
      sed -n '2,20p' "$0" | sed 's/^# //'
      exit 0 ;;
    *)
      echo "未知参数: $1" >&2
      echo "使用 -h 查看帮助" >&2
      exit 1 ;;
  esac
done

# ============================================================================
# 颜色输出
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }
step()  { echo -e "${CYAN}[STEP]${NC} $*"; }

# ============================================================================
# 预检查
# ============================================================================
step "检查环境..."

if [ "$SKIP_BUILD" = false ]; then
  if ! command -v npm &>/dev/null; then
    error "未找到 npm，请安装 Node.js"
    exit 1
  fi
fi

if [ -z "$HOST_PATH" ]; then
  if ! command -v docker &>/dev/null; then
    error "未找到 docker 命令。请安装 Docker 或使用 --host-path 指定宿主机路径"
    exit 1
  fi

  if ! docker ps --format '{{.Names}}' | grep -Fxq "$CONTAINER"; then
    warn "容器 '$CONTAINER' 未在运行中"
    warn "可用容器: $(docker ps --format '{{.Names}}' | tr '\n' ' ')"
    echo ""
    read -rp "是否继续？容器不在运行可能导致安装失败 [y/N]: " confirm
    if [ "${confirm,,}" != "y" ]; then
      info "已取消"
      exit 0
    fi
  fi
fi

# ============================================================================
# 构建
# ============================================================================
if [ "$SKIP_BUILD" = false ]; then
  step "构建插件..."
  cd "$PROJECT_DIR"
  npm run build
  info "构建完成"
else
  step "跳过构建（--skip-build）"
fi

# 验证构建产物
if [ ! -f "$PROJECT_DIR/dist/index.js" ]; then
  error "未找到 dist/index.js，请先运行 npm run build"
  exit 1
fi

# ============================================================================
# 收集待安装文件
# ============================================================================
step "准备安装文件..."

FILES_TO_COPY=(
  "$PROJECT_DIR/dist/index.js"
  "$PROJECT_DIR/plugin.json"
  "$PROJECT_DIR/icon.png"
  "$PROJECT_DIR/preview.png"
  "$PROJECT_DIR/i18n/zh_CN.json"
  "$PROJECT_DIR/i18n/en_US.json"
  "$PROJECT_DIR/README.md"
  "$PROJECT_DIR/README_zh_CN.md"
)

for f in "${FILES_TO_COPY[@]}"; do
  if [ ! -f "$f" ]; then
    warn "缺少文件: $f"
  fi
done

# ============================================================================
# 安装
# ============================================================================
if [ -n "$HOST_PATH" ]; then
  # ---- 直接文件复制（宿主机挂载路径） ----
  step "直接复制到宿主机路径: $HOST_PATH"

  TARGET_DIR="$HOST_PATH/data/plugins/$PLUGIN_NAME"
  mkdir -p "$TARGET_DIR"
  mkdir -p "$TARGET_DIR/i18n"

  cp "$PROJECT_DIR/dist/index.js"     "$TARGET_DIR/index.js"
  cp "$PROJECT_DIR/plugin.json"       "$TARGET_DIR/"
  cp "$PROJECT_DIR/icon.png"          "$TARGET_DIR/" 2>/dev/null || true
  cp "$PROJECT_DIR/preview.png"       "$TARGET_DIR/" 2>/dev/null || true
  cp "$PROJECT_DIR/i18n/zh_CN.json"   "$TARGET_DIR/i18n/"
  cp "$PROJECT_DIR/i18n/en_US.json"   "$TARGET_DIR/i18n/"
  cp "$PROJECT_DIR/README.md"         "$TARGET_DIR/" 2>/dev/null || true
  cp "$PROJECT_DIR/README_zh_CN.md"   "$TARGET_DIR/" 2>/dev/null || true

  info "文件已复制到: $TARGET_DIR"

else
  # ---- docker cp 方式 ----
  step "通过 docker cp 安装到容器 '$CONTAINER'"

  # 创建目标目录结构
  docker exec "$CONTAINER" mkdir -p "$PLUGIN_DIR/i18n" 2>/dev/null || true

  # 逐个复制文件（注意 index.js 在根目录，不在 dist/ 子目录）
  docker cp "$PROJECT_DIR/dist/index.js"     "$CONTAINER:$PLUGIN_DIR/index.js"
  docker cp "$PROJECT_DIR/plugin.json"       "$CONTAINER:$PLUGIN_DIR/"
  docker cp "$PROJECT_DIR/icon.png"          "$CONTAINER:$PLUGIN_DIR/"         2>/dev/null || true
  docker cp "$PROJECT_DIR/preview.png"       "$CONTAINER:$PLUGIN_DIR/"         2>/dev/null || true
  docker cp "$PROJECT_DIR/i18n/zh_CN.json"   "$CONTAINER:$PLUGIN_DIR/i18n/"
  docker cp "$PROJECT_DIR/i18n/en_US.json"   "$CONTAINER:$PLUGIN_DIR/i18n/"
  docker cp "$PROJECT_DIR/README.md"         "$CONTAINER:$PLUGIN_DIR/"         2>/dev/null || true
  docker cp "$PROJECT_DIR/README_zh_CN.md"   "$CONTAINER:$PLUGIN_DIR/"         2>/dev/null || true

  info "文件已复制到容器: $PLUGIN_DIR"
fi

# ============================================================================
# 验证安装
# ============================================================================
step "验证安装..."

if [ -n "$HOST_PATH" ]; then
  TARGET_DIR="$HOST_PATH/data/plugins/$PLUGIN_NAME"
  if [ -f "$TARGET_DIR/index.js" ] && [ -f "$TARGET_DIR/plugin.json" ]; then
    info "✅ 安装验证通过"
    info "   位置: $TARGET_DIR"
    ls -lh "$TARGET_DIR/index.js" | awk '{print "   index.js: " $5}'
  else
    error "安装验证失败，请检查目标目录"
    exit 1
  fi
else
  if docker exec "$CONTAINER" test -f "$PLUGIN_DIR/index.js" 2>/dev/null; then
    info "✅ 安装验证通过"
    docker exec "$CONTAINER" ls -lh "$PLUGIN_DIR/index.js" | awk '{print "   index.js: " $5}'
  else
    error "安装验证失败，文件未在容器中找到"
    exit 1
  fi
fi

# ============================================================================
# 重启容器
# ============================================================================
if [ "$RESTART" = true ] && [ -z "$HOST_PATH" ]; then
  step "重启容器 '$CONTAINER'..."
  docker restart "$CONTAINER"
  info "容器已重启，等待思源就绪..."
  sleep 3
  info "完成。请在思源中 设置 → 集市 → 已下载 → 启用 '通讯录' 插件"
elif [ "$RESTART" = true ] && [ -n "$HOST_PATH" ]; then
  warn "使用 --host-path 模式时无法自动重启。请手动重启容器:"
  warn "  docker restart $CONTAINER"
else
  info "请在思源中刷新插件并启用（设置 → 集市 → 已下载）"
fi
