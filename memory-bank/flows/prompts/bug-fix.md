---
title: "Priming Prompt: Bug Fix"
doc_kind: governance
purpose: Bug-fix цикл report → reproduction → root cause → regression test (first) → fix → docs sync → review.
derived_from:
  - ../../dna/governance.md
  - ../workflows.md
  - ../../engineering/testing-policy.md
status: active
audience: humans_and_agents
---

# Prompt: Bug Fix Cycle

## Flow

`report → reproduction → root cause → regression test → fix → docs sync → review`

## Шаги

1. **Report** — зафиксируй симптом с явной формулировкой: что ожидалось, что происходит. Ссылка на issue/PR/stacktrace/user report.
2. **Reproduction** — воспроизведи локально. Если воспроизвести нельзя — остановись, эскалируй.
3. **Root cause** — найди **источник**, не симптом. Не "сделаем рескью и вернём дефолт" — пойми **почему** код пришёл в это состояние. Используй 5 Whys если нужно.
4. **Regression test FIRST** — напиши падающий тест, который воспроизводит баг. До любого правки кода. См. [`memory-bank/engineering/testing-policy.md`](../../engineering/testing-policy.md) — "Любой bugfix обязан добавить regression test".
5. **Fix** — минимальное изменение, которое делает regression test зелёным. Не добавляй фичи "заодно".
6. **Прогон полного test suite** локально: `bundle exec rspec`, `yarn test` если фронт.
7. **Docs sync** — если фикс раскрыл неправильный контракт/инвариант → обнови canonical owner (см. [`docs-sync.md`](docs-sync.md)).
8. **Commit** fine-grained: (a) regression test добавлен, падает; (b) fix; (c) docs sync если есть.

## Antipatterns

- Silent failure: `rescue => e; nil` без логирования и без понимания.
- "Fallback" без root cause analysis.
- Исправление без regression test.
- Drive-by "улучшения" не связанные с баг.

## Выход

- Root cause кратко
- Regression test (путь к файлу)
- Fix diff
- Коммиты
