#!/usr/bin/env bash
# Stop hook: if files in memory-bank/features/FT-*/ were modified this session,
# emit a reminder to update the corresponding state.yml.

set -euo pipefail

ROOT="/Users/artshevko/dev/apartus"

cd "${ROOT}"

CHANGED=$(git status --porcelain -- memory-bank/features/ 2>/dev/null | awk '{print $2}' | grep -E 'memory-bank/features/FT-[^/]+/' || true)

if [[ -z "${CHANGED}" ]]; then
  exit 0
fi

TOUCHED_FEATURES=$(echo "${CHANGED}" | sed -E 's|memory-bank/features/(FT-[^/]+)/.*|\1|' | sort -u)

NEED_STATE_UPDATE=""
for FT in ${TOUCHED_FEATURES}; do
  if ! echo "${CHANGED}" | grep -q "memory-bank/features/${FT}/state.yml"; then
    NEED_STATE_UPDATE="${NEED_STATE_UPDATE} ${FT}"
  fi
done

NEED_STATE_UPDATE=$(echo "${NEED_STATE_UPDATE}" | xargs)
if [[ -z "${NEED_STATE_UPDATE}" ]]; then
  exit 0
fi

echo "Reminder: в этой вкладке правились файлы в ${NEED_STATE_UPDATE}, но state.yml не обновлён."
echo "Обнови phase / current_step / next_action / last_updated в соответствующих state.yml до завершения сессии."
