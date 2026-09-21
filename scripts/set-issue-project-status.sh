#!/usr/bin/env bash

set -euo pipefail

readonly REPOSITORY="ktul15/multi-vendor-e-commerce-app"
readonly PROJECT_OWNER="ktul15"
readonly PROJECT_NUMBER="2"
readonly PROJECT_ID="PVT_kwHOAcao0M4BQZKp"
readonly STATUS_FIELD_ID="PVTSSF_lAHOAcao0M4BQZKpzg-hsng"
readonly IN_PROGRESS_OPTION_ID="47fc9ee4"
readonly DONE_OPTION_ID="98236657"

usage() {
  echo "Usage: $0 <issue-number> <in-progress|done>" >&2
}

if [[ $# -ne 2 ]]; then
  usage
  exit 2
fi

readonly ISSUE_NUMBER="$1"
readonly STATUS="$2"

if [[ ! "$ISSUE_NUMBER" =~ ^[1-9][0-9]*$ ]]; then
  echo "Error: issue number must be a positive integer." >&2
  usage
  exit 2
fi

case "$STATUS" in
  in-progress)
    readonly STATUS_OPTION_ID="$IN_PROGRESS_OPTION_ID"
    ;;
  done)
    readonly STATUS_OPTION_ID="$DONE_OPTION_ID"
    ;;
  *)
    echo "Error: status must be 'in-progress' or 'done'." >&2
    usage
    exit 2
    ;;
esac

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is required." >&2
  exit 1
fi

issue_url="$(
  gh issue view "$ISSUE_NUMBER" \
    --repo "$REPOSITORY" \
    --json url \
    --jq '.url'
)"

item_id="$(
  gh project item-list "$PROJECT_NUMBER" \
    --owner "$PROJECT_OWNER" \
    --limit 1000 \
    --format json \
    --jq ".items[] | select(.content.type == \"Issue\" and .content.number == $ISSUE_NUMBER and .content.repository == \"$REPOSITORY\") | .id" \
    | head -n 1
)"

if [[ -z "$item_id" ]]; then
  echo "Adding issue #$ISSUE_NUMBER to GitHub Project #$PROJECT_NUMBER..."
  item_id="$(
    gh project item-add "$PROJECT_NUMBER" \
      --owner "$PROJECT_OWNER" \
      --url "$issue_url" \
      --format json \
      --jq '.id'
  )"
fi

if [[ -z "$item_id" ]]; then
  echo "Error: could not resolve a project item for issue #$ISSUE_NUMBER." >&2
  exit 1
fi

gh project item-edit \
  --project-id "$PROJECT_ID" \
  --id "$item_id" \
  --field-id "$STATUS_FIELD_ID" \
  --single-select-option-id "$STATUS_OPTION_ID" \
  >/dev/null

echo "Issue #$ISSUE_NUMBER project status set to '$STATUS'."
