#!/usr/bin/env bash
# SessionStart hook: prints mandatory-read brief + active feature state.
# Active feature is resolved per-tab via git branch (multi-tab safe).
# Output goes directly into Claude's context.

set -euo pipefail

ROOT="/Users/artshevko/dev/apartus"
BRIEF="${ROOT}/.claude/hooks/session-brief.md"
RESOLVE="${ROOT}/.claude/hooks/resolve-active-feature.sh"

if [[ -f "${BRIEF}" ]]; then
  cat "${BRIEF}"
fi

ACTIVE_ID=""
if [[ -x "${RESOLVE}" ]]; then
  ACTIVE_ID=$(bash "${RESOLVE}")
fi

BRANCH=$(git -C "${ROOT}" branch --show-current 2>/dev/null || echo "")

echo
echo "---"
echo
echo "## Контекст вкладки"
echo
echo "Текущая ветка: \`${BRANCH:-<detached>}\`"

if [[ -z "${ACTIVE_ID}" ]]; then
  echo
  echo "Активная фича не определена по ветке — работаешь в bugfix/refactor/docs-режиме."
  echo "Если нужно работать над конкретной фичей — переключись на ветку \`feature/ft-NNN-...\` или установи \`CLAUDE_ACTIVE_FEATURE=FT-NNN\` до старта сессии."
  echo "Для архивных HW-фич: \`CLAUDE_ACTIVE_FEATURE=FT-HW2-FE5\` (резолвер не парсит HW-префикс по ветке)."
  exit 0
fi

STATE_FILE="${ROOT}/memory-bank/features/${ACTIVE_ID}/state.yml"

# Fallback: find the full directory name (FT-NNN-slug) if ACTIVE_ID is just the prefix
if [[ ! -f "${STATE_FILE}" ]]; then
  DIR=$(find "${ROOT}/memory-bank/features" -maxdepth 1 -type d -name "${ACTIVE_ID}-*" 2>/dev/null | head -n1)
  if [[ -n "${DIR}" && -f "${DIR}/state.yml" ]]; then
    STATE_FILE="${DIR}/state.yml"
  fi
fi

if [[ ! -f "${STATE_FILE}" ]]; then
  echo
  echo "## Активная фича: ${ACTIVE_ID}"
  echo
  echo "state.yml не найден в \`memory-bank/features/${ACTIVE_ID}*/\`. Создай через \`/feature-start ${ACTIVE_ID} \"...\"\` или проверь имя фичи."
  exit 0
fi

REL_PATH="${STATE_FILE#${ROOT}/}"

echo
echo "## Активная фича: ${ACTIVE_ID}"
echo
echo "Текущий state (\`${REL_PATH}\`):"
echo
echo '```yaml'
cat "${STATE_FILE}"
echo '```'
echo
echo "Если продолжаешь работу над этой фичей — прочитай \`${REL_PATH%/state.yml}/feature.md\` и при наличии \`implementation-plan.md\`."
echo "Если работаешь над чем-то другим в этой вкладке — игнорируй этот блок."
