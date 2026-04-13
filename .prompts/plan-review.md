# Prompt: Plan Review (Design Ready → Plan Ready)

**ENFORCEMENT:** Автор implementation-plan.md НЕ МОЖЕТ быть ревьюером. Review ОБЯЗАН выполняться отдельным агентом с чистым контекстом. См. [`memory-bank/engineering/autonomy-boundaries.md`](../memory-bank/engineering/autonomy-boundaries.md) секция "Lifecycle Enforcement".

Ревью `implementation-plan.md` по gate "Design Ready → Plan Ready".

## Checklist

- [ ] Frontmatter: `doc_kind: feature`, `doc_function: derived`, `derived_from: [feature.md]`, `status: draft` (готов перевод в `active`).
- [ ] План не переопределяет scope/architecture/acceptance — эти факты живут в `feature.md`.
- [ ] Discovery context заполнен: relevant paths, reference patterns, unresolved questions (`OQ-*`), test surfaces, execution environment.
- [ ] Test Strategy содержит planned automated coverage, required local/CI suites, manual-only gaps с justification и `AG-*`.
- [ ] ≥1 `PRE-*`, ≥1 `STEP-*`, ≥1 `CHK-*`, ≥1 `EVID-*`.
- [ ] Каждый `STEP-*` атомарен: можно выполнить и проверить независимо, указаны touchpoints, Implements (REQ-*), Verifies (CHK-*), Evidence IDs.
- [ ] Порядок шагов корректен, нет цикличных зависимостей.
- [ ] `STEP-*` ссылается на canonical IDs из feature.md, не переопределяет их.
- [ ] Рискованные действия закрыты `AG-*` approval gates.
- [ ] Упомянутые файлы и модули реально существуют в проекте (grounding).
- [ ] `OQ-*` явно зафиксированы и не спрятаны в prose шагов.

## Вывод

Для каждого fail: цитата, почему проблема, как исправить.

Если 0 замечаний — "0 замечаний, план готов к `status: active` (Plan Ready), feature переводится в `delivery_status: in_progress`".

Типичное число итераций: 1-3. Если замечания не уменьшаются за 3 итерации — проблема upstream (feature.md), эскалируй.
