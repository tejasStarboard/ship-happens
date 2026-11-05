#!/usr/bin/env bash
# Local mirror of .github/workflows/ci.yml
# Usage (from repo root):
#   pnpm ci:check   # format:check · lint · typecheck · build
#   pnpm ci:e2e     # db:push + Playwright e2e
#   pnpm ci:all     # check then e2e
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="${1:-check}"
case "$MODE" in
  check | e2e | all) ;;
  *)
    echo "Usage: $0 {check|e2e|all}" >&2
    exit 2
    ;;
esac

# Drop stale CI-port exports from a prior shell so .env / fallbacks win.
unset POSTGRES_URL REDIS_URL 2>/dev/null || true

# Load repo .env if present (compose ports expected).
set -a
# shellcheck disable=SC1091
[ -f .env ] && . ./.env
set +a

# Compose host ports from docker-compose.yml / README (never Actions 5432/6379).
export POSTGRES_SSL="${POSTGRES_SSL:-false}"
export POSTGRES_URL="${POSTGRES_URL:-postgresql://postgres:postgres@127.0.0.1:54325/ship_happens}"
export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:63799}"
export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-ci-better-auth-secret-min-32-characters-long}"
export BETTER_AUTH_DOMAIN="${BETTER_AUTH_DOMAIN:-localhost}"
export APP_URL="${APP_URL:-http://127.0.0.1:3000}"
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://127.0.0.1:3000}"
export RESEND_API_KEY="${RESEND_API_KEY:-re_ci_placeholder}"
export EMAIL_SENDER_NAME="${EMAIL_SENDER_NAME:-Ship Happens CI}"
export EMAIL_SENDER_ADDRESS="${EMAIL_SENDER_ADDRESS:-noreply@example.com}"
export BLOB_STORE_ID="${BLOB_STORE_ID:-local}"
export BLOB_READ_WRITE_TOKEN="${BLOB_READ_WRITE_TOKEN:-vercel_blob_local_placeholder}"
export JEV_API_KEY="${JEV_API_KEY:-jev_ci_placeholder}"
export OUTLOOK_WEBHOOK_CLIENT_STATE="${OUTLOOK_WEBHOOK_CLIENT_STATE:-ship-happens-ci}"
export TURBO_CACHE_DIR="${TURBO_CACHE_DIR:-.turbo}"

refuse_ci_ports() {
  # Match exact host ports 6379 / 5432 only — not compose 63799 / 54325.
  if [[ "$REDIS_URL" =~ :6379(/|$|\?) ]]; then
    echo "Refuse: REDIS_URL uses CI port 6379; use compose port 63799 (see README)" >&2
    exit 1
  fi
  if [[ "$POSTGRES_URL" =~ :5432(/|$|\?) ]]; then
    echo "Refuse: POSTGRES_URL uses CI port 5432; use compose port 54325 (see README)" >&2
    exit 1
  fi
}

refuse_ci_ports

run_check() {
  echo "==> pnpm format:check"
  pnpm format:check
  echo "==> pnpm lint"
  pnpm lint
  echo "==> pnpm typecheck"
  pnpm typecheck
  echo "==> pnpm build"
  pnpm build
}

run_e2e() {
  echo "==> ensuring docker compose (postgres/redis)"
  docker compose up -d
  echo "==> pnpm db:push"
  pnpm db:push
  echo "==> pnpm test:e2e"
  CI=true PLAYWRIGHT_SKIP_WEBSERVER_BUILD=1 pnpm exec turbo build --filter=web...
  CI=true PLAYWRIGHT_SKIP_WEBSERVER_BUILD=1 pnpm test:e2e
}

case "$MODE" in
  check) run_check ;;
  e2e) run_e2e ;;
  all)
    run_check
    run_e2e
    ;;
esac

echo "OK: ci-mirror $MODE"
