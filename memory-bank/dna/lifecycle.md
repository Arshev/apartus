---
doc_kind: governance
doc_function: canonical
purpose: Maintenance rules и sync checklist для governed-документов.
derived_from:
  - governance.md
status: active
---
# Document Lifecycle

Правила, обеспечивающие consistency governed-документации при изменениях.

## Maintenance Rules

1. **Upstream first.** Меняешь факт — сначала найди и обнови canonical owner.
2. **Downstream sync.** После изменения upstream проверь `derived_from`-зависимых.
3. **README sync.** Добавлен/удалён/переименован документ — обнови parent README.
4. **Конфликт = дефект.** Расхождение внутри authoritative set устраняется сразу.
   - *Автор документа* (при изменении): обнаружил конфликт → исправляет в рамках текущего изменения.
   - *Читатель* (при чтении чужого документа): обнаружил конфликт → фиксирует как finding и сообщает человеку. Самостоятельное исправление — только если текущая задача явно затрагивает этот документ.

## Staleness Detection

Governed-документы устаревают молча. Upstream-first rule ловит прямые изменения, но не ловит drift (факт изменился в коде, а doc никто не тронул). Staleness detection — вторая линия защиты.

### Сигналы stale

Документ вероятно устарел, если содержит:

- **Числа** (spec counts, coverage %, количество моделей/endpoints/features) — числа гниют первыми.
- **Статусы** (`planned` / `in_progress` / `done`) — delivery может завершиться, а статус не обновиться.
- **Списки сущностей** (модели в schema.md, endpoints в api-reference.md, features в README.md) — каждая новая feature может добавить сущность.
- **Даты** (абсолютные даты в тексте, `last_verified`, `Last updated` в таблицах).
- **Ссылки на файлы** (paths в Change Surface, reference implementations) — файлы переименовываются и удаляются.

### High-churn документы

Эти документы устаревают чаще всего и требуют проверки при каждом feature cycle:

| Документ | Что гниёт | Когда проверять |
|---|---|---|
| `domain/schema.md` | Модели, поля, ассоциации | После любой миграции |
| `domain/api-reference.md` | Endpoints, params, responses | После изменения контроллеров |
| `domain/frontend.md` | Routes, stores, components | После добавления views/stores |
| `engineering/testing-policy.md` | Spec counts, coverage %, ratchet values | После merge feature |
| `features/README.md` | Feature registry, статусы | После создания/завершения feature |
| `domain/problem.md` | Core workflows, capability roadmap | После закрытия крупной фичи |
| `use-cases/README.md` | Last updated, статусы UC | После изменения cross-feature flow |

### Frontmatter маркер: `last_verified`

Для high-churn документов рекомендуется добавить в frontmatter:

```yaml
last_verified: 2026-04-13   # дата последней проверки актуальности
```

Это не автоматическая дата модификации (git хранит её сам), а осознанное подтверждение: "я проверил, что факты в документе соответствуют текущему состоянию кода."

Обновлять `last_verified` при:

- Прохождении session-start (если doc читался и проверялся)
- Закрытии feature (docs-sync проход)
- Явной ревизии документации

### Триггеры проверки

| Триггер | Что проверять | Кто |
|---|---|---|
| **Feature closure** (delivery_status: done) | docs-sync checklist + `last_verified` на затронутых docs | Агент (по `memory-bank/flows/prompts/docs-sync.md`) |
| **PR review** | Затронутые docs обновлены? Нет stale ссылок? | Агент + человек |
| **Явный запрос** | Пользователь просит проверить актуальность docs | Агент |

Staleness check выполняется при feature closure (docs-sync проход), не при каждом session-start — это экономит время и токены.

### Антипаттерны

- **"Обновлю потом"** — если факт изменился, обновить сейчас (upstream-first rule).
- **Blind trust** — не верить числам в docs без проверки, если doc не читался >30 дней.
- **Partial update** — обновил одно число, но не проверил остальные в том же doc.

## Sync Checklist

Перед фиксацией изменений в governed-документации:

- [ ] frontmatter валиден, для `active` non-root задан `derived_from`
- [ ] для canonical `feature` задан `delivery_status`, для `adr` — `decision_status`
- [ ] parent `README.md` обновлён при изменении состава или reading order
