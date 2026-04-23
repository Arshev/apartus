Добавь blocker в state.yml фичи.

Аргументы: описание блокера (что мешает продолжать). Опционально: `FT-XXX` для override, kind (`open_question` | `approval_gate` | `external` | `adhoc`), canonical ref (`OQ-XX` / `AG-XX`).

1. Определи фичу: `FT-XXX` из аргумента → резолвер (`bash /Users/artshevko/dev/apartus/.claude/hooks/resolve-active-feature.sh`). Если не определена — остановись.
2. Найди каталог `memory-bank/features/<FT-XXX>-*/` и прочитай `state.yml`.
3. Определи kind блокера:
   - нужно решение от владельца / открытый вопрос → `open_question`
   - ждём human approval перед рискованным шагом → `approval_gate`
   - внешняя зависимость (API провайдера, infra, Booking.com / Airbnb iCal) → `external`
   - прочее → `adhoc`
4. Если kind = `open_question` или `approval_gate` и в `feature.md` / `implementation-plan.md` ещё нет соответствующего `OQ-*` / `AG-*` — предложи создать и покажи, где и как добавить.
5. Добавь блокер в `blockers` массив state.yml:

   ```yaml
   - id: <OQ-XX | AG-XX | null>
     kind: <kind>
     description: "<описание>"
     since: <текущая дата>
   ```

6. Обнови `last_updated` и, если уместно, `next_action` (например: «Дождаться ответа по <описание>»).
7. Покажи diff.

Пустое описание — недопустимо. Если аргумент не задан — спроси у пользователя.
