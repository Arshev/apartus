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
# Outputs normalized feature id (FT-NNN / FT-HW*) on stdout, or empty string.

set -euo pipefail

ROOT="/Users/artshevko/dev/apartus"

# normalize: uppercase + zero-pad the trailing number for FT-NNN; leave HW ids as-is.
normalize() {
  local raw="$1"
  local upper
  upper=$(echo "${raw}" | tr '[:lower:]' '[:upper:]')
  if [[ "${upper}" =~ ^FT-HW ]]; then
    echo "${upper}"
    return
  fi
  # FT-7 / ft-007 / ft7 → FT-007. Strip leading zeros before printf to avoid
  # octal reinterpretation ("020" would parse as 16 decimal).
  local num
  num=$(echo "${upper}" | grep -oE '[0-9]+' | head -n1 || true)
  if [[ -n "${num}" ]]; then
    printf "FT-%03d\n" "$((10#${num}))"
  else
    echo "${upper}"
  fi
}

# emit feature id only if a feature package dir WITH state.yml exists.
emit_if_valid() {
  local feature="$1"
  local match
  match=$(find "${ROOT}/memory-bank/features" -maxdepth 1 -type d -name "${feature}-*" 2>/dev/null | head -n1 || true)
  if [[ -n "${match}" && -f "${match}/state.yml" ]]; then
    echo "${feature}"
    return 0
  fi
  if [[ -f "${ROOT}/memory-bank/features/${feature}/state.yml" ]]; then
    echo "${feature}"
    return 0
  fi
  return 1
}

if [[ -n "${CLAUDE_ACTIVE_FEATURE:-}" ]]; then
  emit_if_valid "$(normalize "${CLAUDE_ACTIVE_FEATURE}")" || true
  exit 0
fi

if BRANCH=$(git -C "${ROOT}" branch --show-current 2>/dev/null); then
  if [[ -n "${BRANCH}" ]]; then
    RAW=$(echo "${BRANCH}" | grep -oiE 'ft[-_/]?[0-9]+' | head -n1 || true)
    if [[ -n "${RAW}" ]]; then
      emit_if_valid "$(normalize "${RAW}")" || true
      exit 0
    fi
  fi
fi

exit 0
