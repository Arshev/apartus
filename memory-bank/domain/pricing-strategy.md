---
title: Apartus Pricing Strategy
doc_kind: domain
doc_function: canonical
purpose: Тарифная сетка, unit economics, go-to-market pricing.
derived_from:
  - problem.md
  - integrations-strategy.md
status: active
audience: humans_and_agents
canonical_for:
  - apartus_pricing_tiers
  - apartus_unit_economics
---

# Pricing Strategy

## Модель: Hybrid (база + per-unit)

Доминантная модель для PMS. Покрывает фиксированные расходы (Channex) через базу, масштабируется с клиентом через per-unit.

## Конкуренты

| Конкурент | Рынок | Цена за юнит/мес | Channel Manager |
|---|---|---|---|
| **Bnovo** | RU | ~200-500₽ | включён от Business |
| **TravelLine** | RU | ~150-400₽ | add-on ~2000-5000₽/мес |
| **Guesty** | Global | $16-40/unit | включён |
| **Hostaway** | Global | $12-32/unit | включён |
| **Lodgify** | Global | $17-33/unit | включён |

## Тарифная сетка Apartus

### СНГ рынок (₽, при годовой оплате, помесячная +25%)

| | **Starter** | **Professional** | **Business** | **Enterprise** |
|---|---|---|---|---|
| **Цена** | **Бесплатно** | **3 900₽/мес** + 350₽/unit | **7 900₽/мес** + 300₽/unit | Индивидуально |
| Включено юнитов | 3 | 10 | 30 | Unlimited |
| Max юнитов | 3 | 50 | 200 | 500+ |
| **Channel Manager** | ❌ | ✅ (3 канала) | ✅ (все каналы) | ✅ + приоритет |
| Виджет бронирования | ❌ | ✅ | ✅ | ✅ + custom domain |
| Календарь | iCal | iCal + API | Full API | Full API |
| Пользователи | 1 | 3 | 10 | Unlimited |
| Задачи/уборки | ❌ | Базовые | Расширенные | Полные |
| Автосообщения | ❌ | Шаблоны | Автоматизация | Полная автоматизация |
| Аналитика | Базовая | Стандартная | Расширенная + ADR/RevPAR | Custom + BI export |
| Поддержка | Документация | Email (48ч) | Email (24ч) + чат | Персональный менеджер |

### Мировой рынок (USD)

| | **Starter** | **Professional** | **Business** | **Enterprise** |
|---|---|---|---|---|
| **Цена** | **Free** | **$39/мес** + $4/unit | **$79/мес** + $3.5/unit | Custom |
| Включено юнитов | 3 | 10 | 30 | Unlimited |
| Фичи | = CIS | = CIS | = CIS | = CIS |

Мировые цены ~2.5-3x от СНГ. На 30-50% дешевле Guesty/Hostaway — конкурентное преимущество.

## Примеры стоимости для клиента (годовая оплата, СНГ)

| Кол-во юнитов | Starter | Professional | Business |
|---|---|---|---|
| 3 | 0₽ | 4 950₽/мес | — |
| 10 | — | 7 400₽/мес | — |
| 25 | — | 9 150₽/мес | 12 400₽/мес |
| 50 | — | 17 900₽/мес | 13 900₽/мес |
| 100 | — | — | 28 900₽/мес |

Business дешевле Professional при ~40 юнитах — стимул к апгрейду.

## Unit Economics

### Наши расходы

| Статья | Сумма |
|---|---|
| Channex WhiteLabel | $130/мес (платформа, shared) |
| Channex per-unit | ~$0.5-2/unit/мес |
| Сервер/инфра | ~$50-100/мес |
| Поддержка | ~$10-30/клиент/мес (ранняя стадия) |

### Break-even

Channex $130/мес — фиксированный расход на нашу платформу (не per-customer).
- **3 платящих клиента** покрывают Channex
- **10 клиентов по Professional (avg 15 units)** = MRR ~75 000₽ (~$800/мес). Маржа ~90% до поддержки.
- **50 клиентов** = MRR ~370 000₽ (~$4000/мес). Здоровый бизнес.

## Channel Manager в тарифах

- **Starter**: нет channel manager. iCal только. Хостам с 1-3 юнитами channel manager не нужен.
- **Professional**: 3 основных канала (Booking.com, Airbnb, Ostrovok). Главный upgrade trigger.
- **Business**: все каналы (Expedia, VRBO, Google Hotels, Agoda + all).
- **Enterprise**: все каналы + приоритетная поддержка + SLA.

## Free Tier (Starter) — product-led growth

**Включено** (near-zero cost):
- До 3 юнитов
- Календарь, бронирования, гости
- iCal sync
- Dashboard
- 1 пользователь

**Исключено** (upgrade triggers):
- Channel manager (наш главный cost)
- Виджет бронирования
- Автоматизация сообщений
- Multi-user
- API access
- Расширенная аналитика

**Target conversion**: 10-15% free → paid за 6 месяцев.

## Go-to-Market Phases

### Phase 1 (Launch, 0-6 мес)
- Free Starter + один paid tier (Professional, упрощённо)
- Агрессивная цена: 2 900₽ + 300₽/unit (СНГ), $29 + $3/unit (мир)
- Цель: 50 платящих клиентов, валидация WTP

### Phase 2 (Growth, 6-18 мес)
- Добавить Business tier
- Поднять Professional до целевых цен
- Годовая скидка 20-25%
- Цель: 200+ клиентов, positive unit economics

### Phase 3 (Scale, 18+ мес)
- Enterprise с custom pricing
- Add-on marketplace (revenue management, dynamic pricing, guest screening)
- Комиссионная модель как опция (3-5% per booking, без подписки)
