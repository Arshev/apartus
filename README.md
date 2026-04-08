# Apartus

[![CI](https://github.com/Arshev/apartus/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Arshev/apartus/actions/workflows/ci.yml)
[![Backend coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/Arshev/apartus/main/.github/badges/backend-coverage.json)](backend/spec/spec_helper.rb)
[![Frontend coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/Arshev/apartus/main/.github/badges/frontend-coverage.json)](frontend/vitest.config.js)

SaaS-система управления краткосрочной и долгосрочной арендой недвижимости (PMS — Property Management System).

Единый центр управления объектами, бронированиями, гостями и финансами. Хаб между площадками-агрегаторами (Booking.com, Airbnb) и собственниками недвижимости.

## Стек

| Слой | Технологии |
|------|-----------|
| Backend | Ruby on Rails 8, PostgreSQL, Pundit |
| Frontend | Vue.js 3 (JS), Vuetify 3, Vite, Pinia |
| Структура | Монорепо: `/backend` + `/frontend` |

## Основные модули

- **Объекты и юниты** — иерархия Организация → Объект → Юнит (квартиры, отели, дома, хостелы)
- **Календарь бронирований** — визуальный календарь, статусы, check-in/check-out
- **Channel Manager** — двусторонняя синхронизация с Booking.com, Airbnb и др.
- **Ценообразование** — сезонность, скидки за длительность, динамические цены, лояльность
- **Виджет бронирования** — встраиваемый модуль для сайтов с оплатой и локализацией
- **Финансы** — онлайн-оплата, учёт доходов/расходов, аналитика (occupancy, RevPAR, ADR)
- **Собственники** — привязка объектов, расчёт комиссии УК, выплаты, отчёты
- **CRM** — воронки, лиды, гости/арендаторы, автоматизация
- **Задачи и обслуживание** — канбан, уборки, ремонт, инспекции юнитов
- **Коммуникации** — мессенджер, авто-сообщения гостям, Unified Inbox, Telegram-бот

Подробное описание — в [PROJECT.md](PROJECT.md).

## Быстрый старт

```bash
bin/setup          # bootstrap
bin/rails s        # запуск сервера
bundle exec rspec  # тесты
```

## Настройка окружения

См. [SETUP.md](SETUP.md).
