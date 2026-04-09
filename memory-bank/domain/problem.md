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

- `WF-01` Ведение каталога объектов и юнитов (Property → Unit), иерархия Organization → Branch → Property → Unit.
- `WF-02` Управление календарём бронирований и check-in/check-out (MVP target).
- `WF-03` Ценообразование: базовые тарифы + сезонные цены (MVP target).
- `WF-04` CRM гостей: контакт, история бронирований (MVP minimal).
- `WF-05` Мультитенантность и доступ: organization, memberships, roles (Owner/Manager/Member).
- `WF-06` Channel Manager: двусторонняя синхронизация с площадками (post-MVP).
- `WF-07` Финансы и аналитика: occupancy, RevPAR, ADR, P&L (post-MVP).
- `WF-08` Управление собственниками: комиссии, выплаты, отчёты (post-MVP).
- `WF-09` Задачи и обслуживание: канбан, уборки, инспекции (post-MVP).
- `WF-10` Коммуникации: авто-сообщения, Unified Inbox, Telegram-бот (post-MVP).
- `WF-11` Виджет бронирования: встраиваемый iframe с онлайн-оплатой (post-MVP).

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
- `PCON-03` Money fields — integer cents (см. [`../adr/ADR-004-integer-cents-for-money.md`](../adr/ADR-004-integer-cents-for-money.md)).
- `PCON-04` Monorepo `/backend` + `/frontend`, split ответственности (см. [`../adr/ADR-001-monorepo-structure.md`](../adr/ADR-001-monorepo-structure.md)).

## Capability Roadmap

Не delivery-план — перечень capabilities, которые постепенно закрывает продукт. Каждая capability по мере созревания превращается в feature package.

| Capability | MVP? | Current state | Owner refs |
|---|---|---|---|
| Auth, multi-tenancy, basic roles | yes | done (HW-0) | — |
| Branches hierarchy | yes | done backend (HW-1 F4), frontend pending (HW-2 FE5) | `features/FT-HW1-04-branches/` |
| Property CRUD | yes | done backend (HW-1 F1), frontend pending (HW-2 FE2) | `features/FT-HW1-01-property-crud/` |
| Unit CRUD | yes | done backend (HW-1 F2), frontend pending (HW-2 FE3) | `features/FT-HW1-02-unit-crud/` |
| Amenities M:N | yes | done backend (HW-1 F3), frontend pending (HW-2 FE4) | `features/FT-HW1-03-amenities/` |
| Property↔Branch link | yes | done backend (HW-1 F5) | `features/FT-HW1-05-property-branch-link/` |
| Property/Unit photos | yes | not started | — |
| Reservation calendar | yes | not started | — |
| Pricing (base + seasonal) | yes | not started | — |
| Guests (minimum CRM) | yes | not started | — |
| Channel Manager, Widget, Finances, Owners, CRM full, Tasks, Communications, Loyalty, Dynamic pricing | no (post-MVP) | not started | — |

## Source Documents

- Историческое описание в [`../../PROJECT.md`](../../PROJECT.md) — human-readable маркетинг-fasad, canonical owner теперь этот файл.
- Исходный план в `ai-docs/PLAN.md` был удалён в рамках миграции в memory-bank (HW-2).
