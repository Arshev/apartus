#!/usr/bin/env bash
# Resolves the active feature for the current session/tab.
# Multi-tab safe: each tab's feature is derived from its own git branch.
#
# Priority:
#   1. CLAUDE_ACTIVE_FEATURE environment variable (explicit override)
#   2. Current git branch matching regex [Ff][Tt][-_/]?[0-9]+
#   3. Empty (no active feature — bugfix/refactor/docs mode)
#
# Archived HW features (FT-HW1-*, FT-HW2-FE*) are NOT captured by branch regex.
# Use CLAUDE_ACTIVE_FEATURE=FT-HW2-FE5 explicitly when working on them.
#
# Outputs normalized feature id (FT-NNN) on stdout, or empty string.

set -eu

ROOT="/Users/artshevko/dev/apartus"

if [[ -n "${CLAUDE_ACTIVE_FEATURE:-}" ]]; then
  FEATURE="${CLAUDE_ACTIVE_FEATURE}"
  # Any existing feature package dir (allows FT-NNN or FT-HW* IDs).
  MATCH=$(find "${ROOT}/memory-bank/features" -maxdepth 1 -type d -name "${FEATURE}-*" 2>/dev/null | head -n1 || true)
  if [[ -n "${MATCH}" ]]; then
    echo "${FEATURE}"
  elif [[ -f "${ROOT}/memory-bank/features/${FEATURE}/state.yml" ]]; then
    echo "${FEATURE}"
  fi
  exit 0
fi

if BRANCH=$(git -C "${ROOT}" branch --show-current 2>/dev/null); then
  if [[ -n "${BRANCH}" ]]; then
    RAW=$(echo "${BRANCH}" | grep -oiE 'ft[-_/]?[0-9]+' | head -n1 || true)
    if [[ -n "${RAW}" ]]; then
      NUM=$(echo "${RAW}" | grep -oE '[0-9]+')
      PADDED=$(printf "%03d" "${NUM}")
      FEATURE="FT-${PADDED}"
      MATCH=$(find "${ROOT}/memory-bank/features" -maxdepth 1 -type d -name "${FEATURE}-*" 2>/dev/null | head -n1 || true)
      if [[ -n "${MATCH}" ]]; then
        echo "${FEATURE}"
        exit 0
      fi
    fi
  fi
fi

exit 0
