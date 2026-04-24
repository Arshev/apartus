# FT-037 Plan Review #1 — 2026-04-24

**Reviewer:** general-purpose subagent (автор ≠ ревьюер)
**Gate:** Design Ready → Plan Ready
**Result:** **8 замечаний: 1 P0 + 2 P1 + 5 P2.** План в draft, требует правок.

## P0

- **W1 — WebMock gem отсутствует в Gemfile.** `backend/Gemfile` не содержит webmock; plan Test Strategy + Env Contract его ожидают. NS-08 feature.md запрещает gems без одобрения. **Нужен `AG-05` + `OQ-07` с fallback (self-rolled Net::HTTP stub).**

## P1

- **W2 — STEP-14 нарушает atomicity**: 6 touchpoints разных типов (domain docs + UC + ADR). Разбить на 14a (domain doc updates), 14b (UC creation), 14c (ADR финализация).
- **W3 — STEP-01 check command `rspec spec/models/concerns/permissions_spec.rb` — spec не существует.** Заменить на deterministic grep + ruby eval.

## P2

- **W4 — STEP-10 `Implements` не включает REQ-05.** Добавить.
- **W5 — ADR draft creation нет в STEP.** PRE-02 требует, STEP-14 финализирует; между ними пусто. Добавить ADR file в STEP-02 touchpoints (draft, decision_status: proposed).
- **W6 — STEP-13 touchpoints указывают несуществующие per-env credentials files.** Уточнить "создаются командой `rails credentials:edit --environment`".
- **W7 — OQ-05 (Faraday vs Net::HTTP) уже резолвится grounding'ом.** Faraday в Gemfile нет → Net::HTTP. Резолвнуть сразу.
- **W8 — STEP-10 не фиксирует rescue_from Pundit→403 / RecordNotFound→404.** Добавить в Goal + touchpoints BaseController если нужно.

## Iteration 2 response (автор)

Все 8 замечаний закрыты:

- OQ-07 + AG-05 — escalation for webmock с self-rolled fallback (W1).
- STEP-14 разбит на 14a/14b/14c (W2).
- STEP-01 check — grep + ruby eval (W3).
- STEP-10 Implements += REQ-05 (W4).
- STEP-02 touchpoints += ADR-NNN draft creation (W5).
- STEP-13 touchpoints + уточнение "per-env credentials создаются командой" (W6).
- OQ-05 resolved (Faraday нет → Net::HTTP) (W7).
- STEP-10 Goal = rescue_from Pundit/RecordNotFound в BaseController (W8).
- Env Contract backend test row обновлён ("WebMock TBD через OQ-07/AG-05").
- ER-08 добавлен — fallback при AG-05 denial.
- PAR-02, CP-05 обновлены для STEP-14a/b/c.
