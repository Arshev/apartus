---
title: "UC-005: Organization Onboarding"
doc_kind: use_case
doc_function: canonical
purpose: "New user registers, sets up organization, configures currency, adds properties and team."
derived_from:
  - ../domain/problem.md
status: active
audience: humans_and_agents
---

# UC-005: Organization Onboarding

## Goal

Новый пользователь регистрируется, настраивает организацию, добавляет объекты и приглашает команду.

## Primary Actor

Новый пользователь (будущий owner организации).

## Trigger

Пользователь открывает `/auth/register`.

## Preconditions

- Нет (публичная регистрация).

## Main Flow

1. Пользователь заполняет форму: название организации, имя, фамилия, email, пароль.
2. `POST /api/v1/auth/sign_up` создаёт:
   - Organization (с auto-slug, plan: starter)
   - User
   - Membership (role_enum: owner, role: admin)
   - 3 системные роли (admin, manager, viewer)
3. Redirect на Dashboard → «Здравствуйте, {name}».
4. Настройки → General: выбрать валюту (по умолчанию RUB).
5. Настройки → Integrations: настроить Telegram (bot token + chat ID).
6. Объекты → «Добавить объект»: name, address, type, branch (optional).
7. Юниты → «Добавить»: name, type, capacity, base_price.
8. Настройки → Members → «Добавить»: пригласить менеджера (email + пароль + роль).
9. Бронирования → «Новое бронирование» → UC-001.

## Alternate Flows / Exceptions

- `ALT-01` Multi-org: если пользователь уже есть в системе и входит → видит `select-organization` (если несколько org).
- `ALT-02` Starter plan: max 3 units, max 1 user (org.can_add_units?, can_add_users?).
- `EX-01` Дубль email → 422 validation error.
- `EX-02` Пароль < 8 символов → validation error.
- `EX-03` Пароли не совпадают → client-side «Пароли не совпадают».

## Postconditions

- **Success:** Организация с объектами, юнитами и командой готова к приёму бронирований.
- Системные роли созданы автоматически (admin, manager, viewer).
- Plan = starter (ограничения применяются).

## Business Rules

- `BR-01` Slug auto-generated от name (parameterize). Коллизии → добавляется суффикс -1, -2.
- `BR-02` Owner автоматически получает роль admin + role_enum: owner.
- `BR-03` Plan starter: max 3 units, 1 user, no channels/widget/PDF.
- `BR-04` Валюта по умолчанию RUB, меняется в Settings.

## Traceability

| Upstream / Downstream | References |
|---|---|
| Features | FT-015, FT-016, FT-018 |
| E2E | `e2e/register.spec.js`, `e2e/settings.spec.js` |
