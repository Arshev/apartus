#!/usr/bin/env bash
# Validates memory-bank governance: frontmatter, links, staleness, orphans.
# Usage: ./scripts/validate-memory-bank.sh
# Exit code: 0 = clean, 1 = issues found

set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

error() { echo -e "${RED}ERROR${NC} $1"; ERRORS=$((ERRORS + 1)); }
warn()  { echo -e "${YELLOW}WARN${NC}  $1"; WARNINGS=$((WARNINGS + 1)); }
ok()    { echo -e "${GREEN}OK${NC}    $1"; }

echo "=== Memory Bank Validation ==="
echo ""

# --- 1. Frontmatter ---
echo "--- Frontmatter ---"
FM_OK=true
for f in $(find memory-bank -name '*.md' -not -path '*/flows/templates/*' | sort); do
  if ! head -1 "$f" | grep -q '^---$'; then
    error "$f: no frontmatter"
    FM_OK=false
    continue
  fi

  FM=$(awk '/^---$/{n++; next} n==1{print} n>=2{exit}' "$f")

  if ! echo "$FM" | grep -q '^status:'; then
    error "$f: missing 'status'"
    FM_OK=false
  fi

  if echo "$FM" | grep -q 'doc_function: canonical' && echo "$FM" | grep -q 'doc_kind: feature'; then
    if ! echo "$FM" | grep -q '^delivery_status:'; then
      error "$f: feature canonical missing 'delivery_status'"
      FM_OK=false
    fi
  fi

  if echo "$FM" | grep -q 'doc_kind: adr' && echo "$FM" | grep -q 'doc_function: canonical'; then
    if ! echo "$FM" | grep -q '^decision_status:'; then
      error "$f: ADR missing 'decision_status'"
      FM_OK=false
    fi
  fi
done
$FM_OK && ok "All frontmatter valid"
echo ""

# --- 2. Broken links in READMEs ---
echo "--- Links ---"
LINKS_OK=true
for f in CLAUDE.md AGENTS.md dependency-tree.md $(find memory-bank -name 'README.md' -not -path '*/flows/templates/*' | sort); do
  [ -f "$f" ] || continue
  DIR=$(dirname "$f")

  # Extract relative markdown links
  grep -oE '\]\([^)]+\)' "$f" | sed 's/^](//' | sed 's/)$//' | grep -v '^http' | grep -v '^#' | grep -v '^mailto' | while read -r target; do
    target="${target%%#*}"
    [ -z "$target" ] && continue
    if [ ! -e "$DIR/$target" ]; then
      error "$f → $target (not found)"
      LINKS_OK=false
    fi
  done
done
$LINKS_OK && ok "All links valid"
echo ""

# --- 3. Staleness ---
echo "--- Staleness ---"
STALE_OK=true
TODAY_S=$(date +%s)

for f in $(grep -rl '^last_verified:' memory-bank/ 2>/dev/null); do
  LV=$(awk '/^---$/{n++; next} n==1 && /^last_verified:/{gsub(/last_verified: */, ""); print; exit}' "$f")
  [ -z "$LV" ] && continue

  if LV_S=$(date -j -f "%Y-%m-%d" "$LV" +%s 2>/dev/null); then
    AGE=$(( (TODAY_S - LV_S) / 86400 ))
    if [ "$AGE" -gt 30 ]; then
      warn "$f: last_verified $LV ($AGE days ago)"
      STALE_OK=false
    fi
  fi
done
$STALE_OK && ok "No stale documents"
echo ""

# --- 4. Orphan detection (non-README, non-template, non-feature-internal) ---
echo "--- Orphans ---"
ORPHAN_OK=true

# Collect all link targets from all .md files in memory-bank + root
ALL_LINKS=$(grep -rohE '\]\([^)]+\)' memory-bank/ CLAUDE.md AGENTS.md dependency-tree.md 2>/dev/null \
  | sed 's/^]//' | tr -d '()' | grep -v '^http' | grep -v '^#' | sort -u)

for f in $(find memory-bank -name '*.md' \
  -not -name 'README.md' \
  -not -path '*/flows/templates/*' \
  -not -path '*/features/FT-*/feature.md' \
  -not -path '*/features/FT-*/implementation-plan.md' \
  | sort); do
  BASENAME=$(basename "$f")
  if ! echo "$ALL_LINKS" | grep -q "$BASENAME"; then
    warn "$f: not linked from any document"
    ORPHAN_OK=false
  fi
done
$ORPHAN_OK && ok "No orphan files"
echo ""

# --- Summary ---
echo "=== Summary ==="
echo "Errors:   $ERRORS"
echo "Warnings: $WARNINGS"

if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}FAILED${NC}"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo -e "${YELLOW}PASSED with warnings${NC}"
  exit 0
else
  echo -e "${GREEN}PASSED${NC}"
  exit 0
fi
