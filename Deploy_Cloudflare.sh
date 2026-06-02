#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="deploy"

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      MODE="dry-run"
      ;;
    --no-pause)
      # Giữ tương thích với file .bat, không cần xử lý trên macOS/Linux.
      ;;
    *)
      echo "[Autoscript] Lỗi: Tham số không hỗ trợ: $arg"
      echo "[Autoscript] Cách dùng: ./Deploy_Cloudflare.sh [--dry-run]"
      exit 1
      ;;
  esac
done

cd "$PROJECT_ROOT"

echo
echo "[Autoscript] Bắt đầu deploy Cloudflare Worker."
echo "[Autoscript] Thư mục dự án: $PROJECT_ROOT"

if [[ ! -f "package.json" ]]; then
  echo "[Autoscript] Lỗi: Thiếu package.json."
  exit 1
fi

if [[ ! -f "wrangler.jsonc" ]]; then
  echo "[Autoscript] Lỗi: Thiếu wrangler.jsonc."
  exit 1
fi

if [[ ! -f "public/index.html" ]]; then
  echo "[Autoscript] Lỗi: Thiếu public/index.html."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[Autoscript] Lỗi: Không tìm thấy Node.js trong PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[Autoscript] Lỗi: Không tìm thấy npm trong PATH."
  exit 1
fi

if [[ ! -x "node_modules/.bin/wrangler" ]]; then
  echo "[Autoscript] Chưa có dependencies. Đang chạy npm install..."
  npm install
fi

echo "[Autoscript] Kiểm tra đăng nhập Cloudflare..."
if ! npx wrangler whoami; then
  echo "[Autoscript] Lỗi: Chưa đăng nhập Cloudflare hoặc token không hợp lệ."
  echo "[Autoscript] Chạy lệnh này rồi thử lại: npx wrangler login"
  exit 1
fi

if [[ "$MODE" == "dry-run" ]]; then
  echo "[Autoscript] Chạy dry-run, chưa deploy thật."
  npm run deploy:dry-run
else
  echo "[Autoscript] Deploy thật lên Cloudflare."
  npm run deploy
fi

echo
echo "[Autoscript] Deploy Cloudflare hoàn tất."
