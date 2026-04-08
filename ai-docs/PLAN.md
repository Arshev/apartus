# Apartus — Plan

> Детальный план реализации PMS-системы.
> Чекбоксы `[x]` — реализовано, `[ ]` — предстоит.

---

## Phase 0: Project Bootstrap

Инициализация проекта, настройка окружения, CI/CD.

- [x] **0.1** Инициализация Rails 8 API-only приложения в `/backend`
  - [x] 0.1.1 `rails new backend --api --database=postgresql --skip-test`
  - [x] 0.1.2 Настройка RSpec, FactoryBot, Shoulda Matchers
  - [x] 0.1.3 Настройка Pundit
  - [x] 0.1.4 Настройка rubocop-rails-omakase (включён в Rails 8 из коробки)
  - [x] 0.1.5 Настройка CORS (rack-cors)
  - [x] 0.1.6 Настройка базы данных (development, test)
  - [x] 0.1.7 Конфигурация API-версионирования (`/api/v1`) + health check endpoint
- [x] **0.2** Инициализация Vue 3 SPA в `/frontend`
  - [x] 0.2.1 `yarn create vite frontend --template vue`
  - [x] 0.2.2 Установка и настройка Vuetify 3
  - [x] 0.2.3 Установка и настройка Pinia
  - [x] 0.2.4 Установка и настройка Vue Router 4
  - [x] 0.2.5 Настройка API-клиента (axios) с base URL
  - [x] 0.2.6 Базовый layout: sidebar, topbar, content area
- [x] **0.3** CI/CD и инфраструктура
  - [x] 0.3.1 GitHub Actions: lint + tests backend
  - [x] 0.3.2 GitHub Actions: lint + build frontend
  - ~~0.3.3 Docker Compose~~ — не требуется (PostgreSQL нативный, деплой через Kamal)
  - [x] 0.3.4 Makefile-команды для типовых операций

---

## Phase 1: Auth & Multi-tenancy

Фундамент: аутентификация, организации, роли.

- [x] **1.1** Аутентификация (JWT)
  - [x] 1.1.1 Модель `User` с has_secure_password (bcrypt)
  - [x] 1.1.2 API-эндпоинты: sign_in, sign_up, sign_out, refresh, me
  - [x] 1.1.3 JWT auth (access 15min + refresh 30d) с denylist
  - [x] 1.1.4 Frontend: страницы логина и регистрации
  - [x] 1.1.5 ApplicationController: authenticate_user!, current_user
- [x] **1.2** Мультитенантность
  - [x] 1.2.1 Модель `Organization` (name, slug, settings, preset roles)
  - [x] 1.2.2 Модель `Membership` (user <-> organization, role_enum, role_id)
  - [x] 1.2.3 Scope-изоляция данных через `Current.organization` (X-Organization-Id header)
  - [x] 1.2.4 API: CRUD организаций, приглашение пользователей (members)
  - [x] 1.2.5 Frontend: выбор/переключение организации (org picker + sidebar switcher)
- [x] **1.3** Роли и разрешения
  - [x] 1.3.1 Базовые роли: owner, manager, member (enum на Membership)
  - [x] 1.3.2 Pundit-политики: Organization, Membership, Role
  - [x] 1.3.3 Модель `Role` с permissions (text[]), Permissions concern
  - [x] 1.3.4 API: CRUD ролей с проверкой разрешений
  - [ ] 1.3.5 Frontend: UI управления ролями
- [ ] **1.4** Подразделения (Branches) — отложено до Phase 2
  - [ ] 1.4.1 Модель `Branch` (name, parent_id, timezone)
  - [ ] 1.4.2 Иерархия с parent/children
  - [ ] 1.4.3 Scope видимости сотрудников по подразделениям
  - [ ] 1.4.4 API: CRUD подразделений
  - [ ] 1.4.5 Frontend: дерево подразделений, привязка сотрудников

---

## Phase 2: Properties & Units

Ядро системы — управление объектами и юнитами.

- [ ] **2.1** Модель данных
  - [x] 2.1.1 Модель `Property` (name, address, type, description) — HW-1 F1; `branch_id` отложен в F5
  - [x] 2.1.2 Модель `Unit` (name, unit_type, capacity, status, property_id) — HW-1 F2
  - [ ] 2.1.3 Модель `Amenity` + join-таблица `UnitAmenity`
  - [ ] 2.1.4 Модель `PropertyPhoto` / `UnitPhoto` (Active Storage)
  - [x] 2.1.5 Enum-типы недвижимости: apartment, hotel, house, hostel — HW-1 F1 (реализован как `Property.property_type` enum с `validate: true`)
  - [x] 2.1.6 Enum-статусы юнитов: available, maintenance, blocked — HW-1 F2 (enum с `validate: true`, без FSM)
- [ ] **2.2** API
  - [x] 2.2.1 CRUD `/api/v1/properties` — HW-1 F1 (+ PropertyPolicy)
  - [x] 2.2.2 CRUD `/api/v1/properties/:id/units` — HW-1 F2 (nested route, UnitsController)
  - [ ] 2.2.3 Управление amenities
  - [ ] 2.2.4 Загрузка и управление фотографиями
  - [ ] 2.2.5 Фильтрация и поиск объектов/юнитов
  - [x] 2.2.6 Pundit-политики для properties и units — HW-1 F1 (PropertyPolicy) + F2 (UnitPolicy)
- [ ] **2.3** Frontend
  - [ ] 2.3.1 Список объектов с фильтрами и поиском
  - [ ] 2.3.2 Карточка объекта: инфо, юниты, фото
  - [ ] 2.3.3 Создание/редактирование объекта (форма)
  - [ ] 2.3.4 Список юнитов внутри объекта
  - [ ] 2.3.5 Создание/редактирование юнита (форма с amenities)
  - [ ] 2.3.6 Галерея фотографий с drag-n-drop загрузкой

---

## Phase 3: Booking Calendar

Центральный модуль — календарь бронирований.

- [ ] **3.1** Модель данных
  - [ ] 3.1.1 Модель `Reservation` (unit_id, guest_id, check_in, check_out, status, source, total_cents, notes)
  - [ ] 3.1.2 Статусы бронирования: pending, confirmed, awaiting_payment, checked_in, checked_out, cancelled, no_show
  - [ ] 3.1.3 Модель `DateBlock` (unit_id, start_date, end_date, reason)
  - [ ] 3.1.4 Валидация пересечений дат (no overlapping bookings)
- [ ] **3.2** API
  - [ ] 3.2.1 CRUD `/api/v1/reservations`
  - [ ] 3.2.2 Эндпоинты check-in / check-out с фиксацией времени
  - [ ] 3.2.3 Блокировка дат
  - [ ] 3.2.4 Календарный эндпоинт: доступность по юнитам за период
  - [ ] 3.2.5 Фильтрация: по объекту, юниту, статусу, каналу, датам
  - [ ] 3.2.6 Pundit-политики для reservations
- [ ] **3.3** Frontend
  - [ ] 3.3.1 Визуальный календарь-сетка (timeline view по юнитам)
  - [ ] 3.3.2 Создание бронирования через drag или модальное окно
  - [ ] 3.3.3 Карточка бронирования: детали, гость, статус, оплата
  - [ ] 3.3.4 Смена статусов бронирования (кнопки actions)
  - [ ] 3.3.5 Фильтры и переключение между объектами
  - [ ] 3.3.6 Блокировка дат через календарь

---

## Phase 4: Pricing

Гибкое ценообразование.

- [ ] **4.1** Модель данных
  - [ ] 4.1.1 Модель `Rate` (unit_id, amount_cents, currency, effective_from, effective_to)
  - [ ] 4.1.2 Модель `SeasonalPrice` (unit_id, name, start_date, end_date, amount_cents)
  - [ ] 4.1.3 Модель `LengthDiscount` (unit_id, min_nights, discount_percent)
  - [ ] 4.1.4 Калькулятор стоимости бронирования (учёт сезонов + скидок)
- [ ] **4.2** API
  - [ ] 4.2.1 CRUD тарифов и сезонных цен
  - [ ] 4.2.2 CRUD скидок за длительность
  - [ ] 4.2.3 Эндпоинт расчёта стоимости: `/api/v1/pricing/calculate`
- [ ] **4.3** Frontend
  - [ ] 4.3.1 Таблица тарифов по юнитам
  - [ ] 4.3.2 Календарь сезонных цен (визуальное управление)
  - [ ] 4.3.3 Настройка скидок за длительность
  - [ ] 4.3.4 Превью расчёта стоимости при создании бронирования

---

## Phase 5: Guests & CRM

Управление гостями и воронка продаж.

- [ ] **5.1** Модель данных
  - [ ] 5.1.1 Модель `Contact` (name, email, phone, type: guest/tenant, loyalty_level)
  - [ ] 5.1.2 Модель `Pipeline` (name, organization_id)
  - [ ] 5.1.3 Модель `PipelineStage` (name, position, pipeline_id)
  - [ ] 5.1.4 Модель `Lead` (contact_id, pipeline_id, stage_id, source, assigned_to)
  - [ ] 5.1.5 Модель `LeadSource` (name, type)
  - [ ] 5.1.6 Модель `Activity` (polymorphic: лог действий по лидам/контактам)
- [ ] **5.2** API
  - [ ] 5.2.1 CRUD контактов с поиском и фильтрацией
  - [ ] 5.2.2 CRUD воронок и стадий
  - [ ] 5.2.3 CRUD лидов, смена стадий
  - [ ] 5.2.4 История активностей по контакту/лиду
  - [ ] 5.2.5 Конвертация лида в гостя/арендатора
- [ ] **5.3** Frontend
  - [ ] 5.3.1 Список контактов с поиском и фильтрами
  - [ ] 5.3.2 Карточка контакта: инфо, история бронирований, активности
  - [ ] 5.3.3 Канбан-доска воронки (drag-n-drop лидов между стадиями)
  - [ ] 5.3.4 Создание/редактирование лида
  - [ ] 5.3.5 Таймлайн активностей

---

## Phase 6: Payments & Finance

Оплата, учёт доходов/расходов, аналитика.

- [ ] **6.1** Модель данных
  - [ ] 6.1.1 Модель `Payment` (reservation_id, amount_cents, method, status, paid_at)
  - [ ] 6.1.2 Модель `Invoice` (contact_id, items, total_cents, status, due_date)
  - [ ] 6.1.3 Модель `Expense` (property_id, unit_id, category, amount_cents, date, description)
  - [ ] 6.1.4 Поддержка депозитов (deposit_cents + остаток)
- [ ] **6.2** API
  - [ ] 6.2.1 CRUD платежей, привязка к бронированиям
  - [ ] 6.2.2 CRUD расходов по объектам/юнитам
  - [ ] 6.2.3 Аналитические эндпоинты: occupancy, RevPAR, ADR
  - [ ] 6.2.4 P&L по объектам за период
  - [ ] 6.2.5 Доходность по каналам
- [ ] **6.3** Frontend
  - [ ] 6.3.1 Дашборд: occupancy, RevPAR, ADR, графики
  - [ ] 6.3.2 Таблица платежей с фильтрами
  - [ ] 6.3.3 Учёт расходов: создание, категоризация
  - [ ] 6.3.4 P&L-отчёт по объектам
  - [ ] 6.3.5 Графики доходов по каналам

---

## Phase 7: Owners

Модуль для собственников недвижимости.

- [ ] **7.1** Модель данных
  - [ ] 7.1.1 Модель `Owner` (contact_id, organization_id)
  - [ ] 7.1.2 Модель `OwnershipAssignment` (owner_id, property_id/unit_id, commission_type, commission_value)
  - [ ] 7.1.3 Модель `OwnerPayout` (owner_id, period, amount_cents, status)
- [ ] **7.2** API
  - [ ] 7.2.1 Привязка собственников к объектам/юнитам
  - [ ] 7.2.2 Расчёт доли собственника за период
  - [ ] 7.2.3 Формирование и управление выплатами
  - [ ] 7.2.4 Отчёты для собственника по его объектам
- [ ] **7.3** Frontend
  - [ ] 7.3.1 Список собственников
  - [ ] 7.3.2 Карточка собственника: объекты, комиссия, выплаты
  - [ ] 7.3.3 Формирование акта выплат
  - [ ] 7.3.4 Личный кабинет собственника (отдельный view)

---

## Phase 8: Tasks & Maintenance

Задачи, наряд-заказы, инспекции.

- [ ] **8.1** Модель данных
  - [ ] 8.1.1 Модель `Task` (title, description, status, priority, assignee_id, due_date, recurrence)
  - [ ] 8.1.2 Модель `TaskBoard` / `TaskStage` (канбан-стадии)
  - [ ] 8.1.3 Модель `WorkOrder` (unit_id, description, status, cost_cents, assignee_id)
  - [ ] 8.1.4 Модель `Inspection` (unit_id, reservation_id, type: check_in/check_out, checklist, findings)
- [ ] **8.2** API
  - [ ] 8.2.1 CRUD задач, фильтрация, назначение
  - [ ] 8.2.2 Рекуррентные задачи (авто-создание по расписанию)
  - [ ] 8.2.3 CRUD наряд-заказов
  - [ ] 8.2.4 CRUD инспекций с чек-листами
  - [ ] 8.2.5 Автоматическое создание задачи на уборку при check-out
- [ ] **8.3** Frontend
  - [ ] 8.3.1 Канбан-доска задач (drag-n-drop)
  - [ ] 8.3.2 Создание/редактирование задачи
  - [ ] 8.3.3 Список наряд-заказов
  - [ ] 8.3.4 Форма инспекции с чек-листом и загрузкой фото

---

## Phase 9: Booking Widget

Встраиваемый виджет бронирования.

- [ ] **9.1** Backend
  - [ ] 9.1.1 Публичный API: доступность, цены, создание бронирования
  - [ ] 9.1.2 Модель `WidgetConfig` (property_id, colors, logo, fonts, locale)
  - [ ] 9.1.3 Защита публичного API (rate limiting, CSRF для iframe)
- [ ] **9.2** Widget (отдельный Vue-бандл или Web Component)
  - [ ] 9.2.1 Выбор дат, юнита, количества гостей
  - [ ] 9.2.2 Отображение цен с учётом сезонности и скидок
  - [ ] 9.2.3 Форма бронирования + подтверждение
  - [ ] 9.2.4 Адаптивный дизайн (мобильные, планшеты, десктоп)
  - [ ] 9.2.5 Кастомизация внешнего вида из панели управления
  - [ ] 9.2.6 Локализация (RU, EN)
- [ ] **9.3** Интеграция
  - [ ] 9.3.1 JS-сниппет для вставки на сайт
  - [ ] 9.3.2 Iframe-вариант с настраиваемыми параметрами

---

## Phase 10: Channel Manager

Двусторонняя синхронизация с площадками.

- [ ] **10.1** Архитектура
  - [ ] 10.1.1 Модель `Channel` (name, type, credentials, status)
  - [ ] 10.1.2 Модель `ChannelMapping` (channel_id, unit_id, external_id)
  - [ ] 10.1.3 Модель `SyncLog` (channel_id, direction, status, payload)
  - [ ] 10.1.4 Абстрактный адаптер для каналов (стратегия для каждой площадки)
- [ ] **10.2** Интеграции
  - [ ] 10.2.1 Booking.com — синхронизация доступности и цен
  - [ ] 10.2.2 Airbnb — синхронизация через iCal / API
  - [ ] 10.2.3 Ostrovok — интеграция
  - [ ] 10.2.4 Импорт бронирований с площадок
  - [ ] 10.2.5 Авто-обновление доступности при новом бронировании
- [ ] **10.3** Frontend
  - [ ] 10.3.1 Список подключённых каналов
  - [ ] 10.3.2 Маппинг юнитов на внешние ID
  - [ ] 10.3.3 Статус синхронизации, логи ошибок
  - [ ] 10.3.4 Управление контентом через систему

---

## Phase 11: Communications

Уведомления, авто-сообщения, unified inbox.

- [ ] **11.1** Уведомления
  - [ ] 11.1.1 Email-уведомления (Action Mailer): подтверждение, напоминания
  - [ ] 11.1.2 Модель `MessageTemplate` (event, channel, body, locale)
  - [ ] 11.1.3 Настраиваемые шаблоны авто-сообщений гостям
  - [ ] 11.1.4 Триггеры: booking confirmed, pre-check-in, post-check-out
- [ ] **11.2** Telegram-бот
  - [ ] 11.2.1 Бот для уведомлений сотрудникам
  - [ ] 11.2.2 Настройка подписок на события
- [ ] **11.3** Внутренний мессенджер
  - [ ] 11.3.1 Модель `Conversation`, `Message`
  - [ ] 11.3.2 Чат между сотрудниками (Action Cable / WebSocket)
  - [ ] 11.3.3 Frontend: интерфейс чата
- [ ] **11.4** Unified Inbox
  - [ ] 11.4.1 Агрегация сообщений от гостей из каналов
  - [ ] 11.4.2 Frontend: единый интерфейс входящих

---

## Phase 12: Advanced Features

Продвинутый функционал, полировка.

- [ ] **12.1** Динамическое ценообразование
  - [ ] 12.1.1 Правила авто-корректировки цен на основе загрузки
  - [ ] 12.1.2 UI настройки правил
- [ ] **12.2** Программа лояльности
  - [ ] 12.2.1 Модель `LoyaltyProgram`, `LoyaltyTransaction`
  - [ ] 12.2.2 Накопление баллов, уровни, скидки
  - [ ] 12.2.3 Frontend: карточка лояльности в профиле гостя
- [ ] **12.3** CRM-автоматизация
  - [ ] 12.3.1 Модель `AutomationRule` (trigger, condition, action)
  - [ ] 12.3.2 Триггеры: создание лида, смена стадии, N дней без активности
  - [ ] 12.3.3 Действия: назначить, уведомить, переместить, создать задачу
- [ ] **12.4** Платёжные интеграции
  - [ ] 12.4.1 Интеграция с ЮKassa
  - [ ] 12.4.2 Интеграция со Stripe
  - [ ] 12.4.3 Онлайн-оплата через виджет бронирования
- [ ] **12.5** Локализация
  - [ ] 12.5.1 Backend: I18n (ru, en)
  - [ ] 12.5.2 Frontend: vue-i18n (ru, en)

---

## Принципы работы с планом

1. **Итеративность** — каждая фаза завершается рабочим инкрементом, который можно показать и протестировать
2. **Вертикальные слайсы** — внутри фазы реализуем полный стек (модель → API → тесты → UI)
3. **Тесты первым делом** — каждый эндпоинт покрыт RSpec-тестами, модели — юнит-тестами
4. **Чекбокс = PR** — каждый пункт-лист (`x.y.z`) соответствует одному логическому коммиту или PR
5. **Приоритет зависимостей** — фазы упорядочены по зависимостям, но внутри фазы задачи можно параллелить
