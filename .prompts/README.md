# .prompts — операционные промпты под memory-bank Apartus

Промпты для типовых flow. Каждый промпт самодостаточен — копируешь в новую сессию как отправной input.

| Промпт | Когда использовать |
|---|---|
| [feature-draft.md](feature-draft.md) | Создать новый feature package (feature.md draft) |
| [feature-review.md](feature-review.md) | Ревью feature.md по Draft→Design Ready gate |
| [plan-draft.md](plan-draft.md) | Создать implementation-plan.md с discovery context |
| [plan-review.md](plan-review.md) | Ревью implementation-plan.md по Design Ready→Plan Ready gate |
| [implement.md](implement.md) | Выполнение плана STEP за STEP с evidence |
| [adr-draft.md](adr-draft.md) | Завести новый ADR |
| [docs-sync.md](docs-sync.md) | Upstream-first sync после изменения кода |
| [bug-fix.md](bug-fix.md) | Bug-fix цикл с regression test |

Все промпты опираются на taxonomy из [`../memory-bank/flows/feature-flow.md`](../memory-bank/flows/feature-flow.md) (REQ-*, NS-*, SC-*, CHK-*, EVID-*, PRE-*, STEP-*, OQ-*, AG-*).
