---
title: "Priming Prompt: ADR Draft"
doc_kind: governance
purpose: Создание нового Architecture Decision Record из шаблона с корректным decision_status и записью в реестре.
derived_from:
  - ../../dna/governance.md
  - ../templates/adr/ADR-XXX.md
status: active
audience: humans_and_agents
---

# Prompt: ADR Draft

Создай новый Architecture Decision Record в `memory-bank/adr/ADR-NNN-<short-name>.md`.

## Когда писать ADR

- Решение затрагивает архитектуру, контракты, data model, стек.
- Решение нетривиальное — есть альтернативы и trade-offs.
- Решение будет влиять на будущие фичи.
- Решение нельзя вывести из кода без пояснения "почему".

Если это просто локальный выбор внутри одной фичи — ADR не нужен, фиксируй как `DEC-*` в `feature.md`.

## Шаги

1. Прочитай [`memory-bank/adr/README.md`](../../adr/README.md) — реестр. Возьми следующий свободный номер (монотонно, не переиспользуется).
2. Скопируй шаблон из [`memory-bank/flows/templates/adr/ADR-XXX.md`](../templates/adr/ADR-XXX.md) (embedded contract ниже wrapper frontmatter).
3. Создай `memory-bank/adr/ADR-NNN-<short-name>.md`.
4. Frontmatter:

   ```yaml
   title: "ADR-NNN: Short Name"
   doc_kind: adr
   doc_function: canonical
   purpose: "..."
   derived_from:
     - <upstream, обычно feature.md или domain doc>
   status: draft          # → active после обсуждения
   decision_status: proposed   # → accepted / rejected / superseded
   date: YYYY-MM-DD
   ```

5. Body по шаблону: Контекст, Драйверы, Рассмотренные варианты (таблица), Решение, Последствия (+/-/нейтральные), Риски, Follow-up, Связанные ссылки.
6. Для `decision_status: proposed` — избегай языка финального выбора ("выбрано", "окончательно"). Только после перевода в `accepted` обнови формулировки.
7. Обнови [`memory-bank/adr/README.md`](../../adr/README.md) — добавь строку в таблицу реестра.

## Выход

- Путь к созданному ADR
- Запись в реестре README
- Явно: `decision_status: proposed` до подтверждения
