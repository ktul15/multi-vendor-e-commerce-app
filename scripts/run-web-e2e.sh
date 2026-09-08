#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
reset_started=0

cleanup() {
  local test_exit_code=$?
  local cleanup_exit_code=0
  local cache_cleanup_exit_code=0

  if [[ "$reset_started" -eq 1 ]]; then
    npm --prefix "$repository_root/backend" run db:e2e:cleanup || cleanup_exit_code=$?
    npm --prefix "$repository_root/backend" run cache:e2e:cleanup || cache_cleanup_exit_code=$?
    if [[ "$cleanup_exit_code" -eq 0 ]]; then
      cleanup_exit_code=$cache_cleanup_exit_code
    fi
  fi

  trap - EXIT
  if [[ "$test_exit_code" -ne 0 ]]; then
    exit "$test_exit_code"
  fi
  exit "$cleanup_exit_code"
}

trap cleanup EXIT
cd "$repository_root"
export PLAYWRIGHT_REUSE_EXISTING_SERVERS=0
export PLAYWRIGHT_START_BACKEND=1

if [[ "${1:-}" == "--" ]]; then
  shift
fi

for project in vendor-chromium admin-chromium; do
  echo "Resetting web E2E data for $project..."
  reset_started=1
  npm --prefix backend run cache:e2e:cleanup
  npm --prefix backend run db:e2e:seed
  pnpm exec playwright test --project="$project" "$@"
done
