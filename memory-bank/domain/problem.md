---
title: Apartus Problem Statement
doc_kind: domain
doc_function: canonical
purpose: Canonical продуктовый контекст Apartus. Upstream для всех feature-документов.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
canonical_for:
  - project_problem_statement
  - product_context
  - target_audience
  - mvp_scope
  - product_roadmap_capabilities
---

# Apartus Problem Statement

## Product Context

Apartus — SaaS Property Management System (PMS) для управления краткосрочной и долгосрочной арендой недвижимости. Выступает единым центром управления объектами, бронированиями, гостями и финансами; хаб между площадками-агрегаторами (Booking.com, Airbnb и др.) и собственниками недвижимости. Фокус — русскоязычный рынок.

Рынок краткосрочной аренды растёт, но большинство арендодателей и небольших УК ведут учёт вручную или в разрозненных инструментах. Apartus объединяет календарь, каналы продаж, ценообразование, CRM, финансы и обслуживание в одной системе.

## Target Users

- **Управляющие компании (УК)** — 10–500+ юнитов, управляют чужой недвижимостью за комиссию. Нуждаются в прозрачной отчётности перед собственниками, автоматическом расчёте выплат, масштабируемом инструменте.
- **Частные арендодатели** — 1–10 объектов, самостоятельно управляют арендой. Нуждаются в простом инструменте синхронизации календарей, приёма бронирований, учёта доходов.

Оба сегмента обслуживаются через разные тарифные планы по числу юнитов.

## Core Workflows

- `WF-01` Ведение каталога объектов и юнитов (Property → Unit), иерархия Organization → Branch → Property → Unit. ✅
- `WF-02` Управление календарём бронирований и check-in/check-out. ✅
- `WF-03` Ценообразование: базовые тарифы + сезонные цены + dynamic pricing. ✅
- `WF-04` CRM гостей: контакт, история бронирований, tags, source. ✅
- `WF-05` Мультитенантность и доступ: organization, memberships, roles, plans. ✅
- `WF-06` Channel Manager: iCal export/import с площадками (Booking.com, Airbnb, Островок). ✅
- `WF-07` Финансы и аналитика: expenses, occupancy, RevPAR, ADR, P&L, PDF. ✅
- `WF-08` Управление собственниками: комиссии, выплаты, отчёты, PDF statements. ✅
- `WF-09` Задачи и обслуживание: канбан, уборки, инспекции. ✅
- `WF-10` Коммуникации: email-уведомления гостям + Telegram-бот. ✅
- `WF-11` Виджет бронирования: встраиваемый booking widget. ✅

## MVP Scope (активный фокус)

Минимально работающий PMS для частного арендодателя и небольшой УК:

1. **Мультитенантность и доступ** — Organization, User, Membership, базовые роли, Branches (иерархия подразделений).
2. **Объекты и юниты** — Property + Unit CRUD, amenities, типы (apartment/hotel/house/hostel).
3. **Календарь бронирований** — ручное создание Reservation, визуальный календарь, статусы, check-in/check-out, блокировка дат.
4. **Базовое ценообразование** — цена за ночь, сезонные цены, расчёт стоимости.
5. **Гости (minimum CRM)** — карточка гостя, связь с Reservation.

## Non-Goals (сознательно отложено до завершения MVP)

- Channel Manager и интеграции с Booking.com/Airbnb/Ostrovok
- Виджет бронирования, онлайн-оплата, платёжные шлюзы
- Полноценные финансы: счета, расходы, P&L, RevPAR/ADR/occupancy аналитика
- Модуль собственников (комиссии, акты выплат, личный кабинет)
- Полный CRM: воронки, лиды, LeadSource, автоматизации, таймлайн
- Задачи, канбан, наряд-заказы, инспекции юнитов
- Коммуникации: мессенджер, авто-сообщения, Unified Inbox, Telegram-бот
- Динамическое ценообразование, скидки за длительность, лояльность
- Кастомные роли с гранулярными разрешениями (сверх трёх базовых)

## Product Constraints

- `PCON-01` Mult-tenant isolation: данные одной организации не должны пересекаться с другой ни через какой API-путь.
- `PCON-02` Русский язык — основной, английский — второй. Все UI-копии локализуемы.
- `PCON-03` Money fields — integer cents (см. [`../adr/ADR-004-integer-cents-for-money.md`](../adr/ADR-004-integer-cents-for-money.md)). Валюта сейчас hardcoded ₽ — запланирована настраиваемая валюта per organization (см. backlog ниже).
- `PCON-04` Monorepo `/backend` + `/frontend`, split ответственности (см. [`../adr/ADR-001-monorepo-structure.md`](../adr/ADR-001-monorepo-structure.md)).

## Capability Roadmap

Не delivery-план — перечень capabilities, которые постепенно закрывает продукт. Каждая capability по мере созревания превращается в feature package.

| Capability | MVP? | Current state | Owner refs |
|---|---|---|---|
| Auth, multi-tenancy, basic roles | yes | done full-stack (HW-0 + HW-2 Settings) | — |
| Branches hierarchy | yes | done full-stack (HW-1 backend + HW-2 FE5 tree UI) | `features/FT-HW1-04-branches/`, `features/FT-HW2-FE5-branches-tree-ui/` |
| Property CRUD | yes | done full-stack (HW-1 backend + HW-2 FE2 UI) | `features/FT-HW1-01-property-crud/`, `features/FT-HW2-FE2-properties-ui/` |
| Unit CRUD | yes | done full-stack (HW-1 backend + HW-2 FE3 UI) | `features/FT-HW1-02-unit-crud/`, `features/FT-HW2-FE3-units-ui/` |
| Amenities M:N | yes | done full-stack (HW-1 backend + HW-2 FE4 UI + attach/detach) | `features/FT-HW1-03-amenities/`, `features/FT-HW2-FE4-amenities-catalog-ui/` |
| Property↔Branch link | yes | done full-stack (HW-1 backend + branch selector in FE2) | `features/FT-HW1-05-property-branch-link/` |
| Organization settings | yes | done full-stack (HW-2 Settings: org/members/roles) | — |
| Guests (minimum CRM) | yes | done full-stack (FT-001) | `features/FT-001-guests/` |
| Reservation calendar | yes | done full-stack (FT-002) | `features/FT-002-reservations/` |
| Pricing (base + seasonal) | yes | done full-stack (FT-003) | `features/FT-003-pricing/` |
| Property/Unit photos | yes | done full-stack (FT-004) | `features/FT-004-photos/` |
| Dashboard analytics | yes | done full-stack (FT-005) | `features/FT-005-dashboard-analytics/` |
| Calendar view | yes | done full-stack (FT-006) | `features/FT-006-calendar-view/` |
| Finances (expenses + reports) | yes | done full-stack (FT-007) | `features/FT-007-finances/` |
| Tasks (kanban) | yes | done full-stack (FT-008) | `features/FT-008-tasks/` |
| Communications (email) | yes | done full-stack (FT-009) | `features/FT-009-communications/` |
| Booking widget | yes | done full-stack (FT-010) | `features/FT-010-booking-widget/` |
| Channel Manager (iCal) | yes | done full-stack (FT-011) | `features/FT-011-channel-manager/` |
| Owner module | yes | done full-stack (FT-012) | `features/FT-012-owner-module/` |
| Dynamic pricing | yes | done full-stack (FT-013) | `features/FT-013-dynamic-pricing/` |
| Guest CRM extended | yes | done full-stack (FT-014) | `features/FT-014-guest-crm-extended/` |
| Configurable currency | yes | done full-stack (FT-015) | `features/FT-015-configurable-currency/` |
| Telegram notifications | no (platform) | done full-stack (FT-016) | `features/FT-016-telegram-bot/` |
| PDF export | no (platform) | done full-stack (FT-017) | `features/FT-017-pdf-export/` |
| Subscription plans | no (platform) | done full-stack (FT-018) | `features/FT-018-subscriptions/` |

## Backlog (запланировано, не начато)

| Item | Description | Priority | Feature |
|---|---|---|---|
| i18n (vue-i18n) | Вынос UI строк в i18n файлы, переключение языка ru/en | high | FT-019 (planned) |
| Multi-currency | Поддержка нескольких валют в одной org (конвертация, курсы) | low | — |
| Visual calendar (month view) | Помесячный grid-календарь помимо timeline | medium | — |
| Drag-and-drop calendar | Перетаскивание бронирований на timeline | low | — |
| AI yield management | Автоматическая оптимизация цен на основе спроса | low | — |
| Unified Inbox | Единый inbox для сообщений из всех каналов | low | — |
| AI yield management | ML-based dynamic pricing на основе исторических данных | low | — |
| Telegram bot | Уведомления + управление через Telegram | low | — |
| Unified Inbox | Агрегация сообщений из каналов + email | low | — |

## Source Documents

- Историческое описание в [`../../PROJECT.md`](../../PROJECT.md) — human-readable маркетинг-fasad, canonical owner теперь этот файл.
- Исходный план в `ai-docs/PLAN.md` был удалён в рамках миграции в memory-bank (HW-2).
