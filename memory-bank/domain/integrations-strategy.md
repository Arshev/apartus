---
title: Apartus Integration Strategy
doc_kind: domain
doc_function: canonical
purpose: Стратегия интеграций PMS — приоритеты, архитектура, build vs buy.
derived_from:
  - problem.md
  - architecture.md
status: active
audience: humans_and_agents
canonical_for:
  - apartus_integration_strategy
  - apartus_adapter_architecture
---

# Integration Strategy

## Архитектурный паттерн: Adapter + Event Bus

```
[Booking Event] → EventBus → [ChannelManagerAdapter]
                            → [PaymentAdapter]
                            → [NotificationAdapter]
                            → [TaskScheduler]
```

- **Adapter Pattern** — каждая внешняя система за интерфейсом. Меняем провайдера без изменения бизнес-логики.
- **Event Bus** — ActiveSupport::Notifications или Redis Streams. Не Kafka — overkill для текущего масштаба.
- **Webhooks** — исходящие для extensibility, входящие от OTA/платежей.
- **Без plugin marketplace** — преждевременно. Adapter interfaces дают ту же гибкость.

## Приоритеты

| Priority | Интеграция | Тип | Провайдер | Status |
|---|---|---|---|---|
| **P0** | Channel Manager | phased | **Phase 1: iCal** (done FT-011). **Phase 2: Bnovo API** (~2000₽/мес, поддерживает Ostrovok + Sutochno). **Phase 3: Direct API** (Booking.com/Airbnb partner) при масштабе. | iCal done |
| **P0** | Платежи | integrate | YooKassa (marketplace splits), fallback Tinkoff | planned |
| **P0** | Email + Telegram | build adapters | SMTP/SendGrid + Telegram Bot API | email done (FT-009), Telegram planned |
| **P1** | Финансовый экспорт | build | CSV/XLSX export из Reports | planned |
| **P1** | Cleaning task dispatch | build | auto-task on checkout (уже есть FT-008) | done |
| **P1** | Auto-review requests | build | email N дней после checkout | planned |
| **P2** | 1С / МойСклад | integrate | CommerceML XML / MoySklad API | planned |
| **P2** | Dynamic pricing API | integrate | PriceLabs / Beyond Pricing webhook | planned |
| **P3** | Smart locks | integrate | Nuki / Igloohome REST API | planned |
| **P3** | Direct OTA APIs | build | Booking.com XML (3-6 мес сертификация), Airbnb REST (2-4 мес) | deferred |

## Channel Manager — phased approach

Channex.io ($69/мес за 5 properties) слишком дорого для стартапа. Альтернативы:

| Фаза | Решение | Стоимость | Что даёт |
|---|---|---|---|
| **Phase 1 (сейчас)** | iCal sync | $0 | Базовая синхронизация календарей. Достаточно для <5 properties + 1-2 OTA. |
| **Phase 2 (первый revenue)** | **Bnovo** API | ~2000₽/мес | Полная синхронизация: calendar + rates + bookings. **Ostrovok + Sutochno** (ключевые RU OTA). |
| **Phase 3 (масштаб)** | Direct Booking.com / Airbnb Partner API | Dev cost | Убираем посредника. Требует сертификации + established company. |

**Bnovo** (bnovo.ru) — российский channel manager. Дешевле западных, поддерживает российские OTA. TravelLine (~3000₽/мес) — альтернатива.

**iCal ограничения** (приемлемы на MVP): задержка 15-30мин, нет push цен, нет данных гостя из OTA, нет instant availability update.

## Что НЕ строить самим

- **Channel manager** — iCal сейчас, Bnovo при revenue, direct API при масштабе. Никогда не строить свой channel manager.
- **Payment processing** — YooKassa/Tinkoff marketplace. Не строим escrow/split самостоятельно.
- **Accounting engine** — экспорт в 1С/МойСклад, не дублируем бухгалтерию.
- **SMS/Email delivery** — SendGrid/Mailgun, не свой SMTP.

## Каналы (Channel Manager)

- **iCal** — минимальная интеграция (done в FT-011). Только календарь, без цен/гостей.
- **Channex.io** — агрегатор, один REST API → Booking.com, Airbnb, Expedia, VRBO, Ostrovok. Phase 1 target.
- **Direct API** — Booking.com (SOAP XML), Airbnb (REST + OAuth 2.0). Phase 3+ если volume оправдывает.

## Платежи (Россия)

- **YooKassa** — основной. Safe Deal / marketplace splits. Pre-auth для депозитов.
- **Tinkoff Acquiring** — fallback. Pre-auth, recurring.
- **Stripe** — не работает в РФ. Для международной версии.
- Абстракция: `PaymentGateway` adapter interface.

## Коммуникации

Приоритет: Email > Telegram Bot > SMS > WhatsApp

- Email: ActionMailer + SendGrid adapter (production)
- Telegram: Bot API, уведомления о бронированиях + управление
- SMS: Twilio или локальные (SMSCenter, SMSC.ru)
- WhatsApp: через Twilio или прямой Business API
- Unified Inbox: агрегация сообщений из OTA через Channel Manager API

## IoT / Smart Locks

- Nuki, Yale, Igloohome — REST API для генерации кодов
- Pattern: booking confirmed → generate check-in code → revoke on checkout
- Phase 2-3. Российский рынок пока больше на физических ключницах.

## Adapter Interface (Ruby)

```ruby
# app/adapters/payment_gateway.rb
class PaymentGateway
  def charge(amount_cents:, currency:, description:, metadata: {})
    raise NotImplementedError
  end

  def refund(transaction_id:, amount_cents: nil)
    raise NotImplementedError
  end
end

# app/adapters/yookassa_gateway.rb
class YookassaGateway < PaymentGateway
  def charge(...) = # YooKassa API call
end
```

Такой же паттерн для NotificationAdapter, ChannelManagerAdapter, SmartLockAdapter.
