# Prompt: Code Review (Agent-First)

**ENFORCEMENT:** Выполняется ПОСЛЕ реализации (все STEP-* пройдены), ПЕРЕД human review / PR. Запускается как отдельный проход через Agent tool (subagent_type: quality-engineer или code-reviewer) с чистым контекстом. Агент ревьюит код по критериям из [`memory-bank/flows/review-criteria.md`](../memory-bank/flows/review-criteria.md).

## Grounding

1. Прочитай sibling `feature.md` — canonical AC (SC-*, CHK-*, EVID-*).
2. Прочитай `implementation-plan.md` — какие STEP-* были выполнены, какие touchpoints затронуты.
3. Прочитай [`memory-bank/flows/review-criteria.md`](../memory-bank/flows/review-criteria.md) секция "Критерии code review".
4. Посмотри `git diff` или измененные файлы.

## Checklist

### Соответствие спеке

- [ ] Код реализует все SC-* из feature.md — ни один не пропущен
- [ ] Код не делает лишнего — нет функциональности, которой нет в спеке (gold plating)
- [ ] Инварианты (INV-*) и ограничения (CON-*, NT-*) из feature.md не нарушены

### Корректность

- [ ] Edge cases обработаны (null, пустые коллекции, граничные значения)
- [ ] Нет off-by-one, race conditions, утечек ресурсов

### Безопасность

- [ ] Нет SQL injection, XSS, command injection
- [ ] Секреты не захардкожены
- [ ] Входные данные валидируются на границе системы

### Читаемость

- [ ] Именование отражает намерение
- [ ] Нет дублирования (три строки лучше premature abstraction)
- [ ] Нет dead code

### Архитектура

- [ ] Изменение в правильном слое
- [ ] Не ломает существующие контракты
- [ ] Изменение соразмерно задаче

### Тесты

- [ ] Покрывают AC из feature.md (SC-*, NEG-*)
- [ ] Проверяют поведение, не реализацию
- [ ] Coverage ratchet не понижен

### Производительность

- [ ] Нет N+1 запросов
- [ ] Запросы используют индексы

## Вывод

Для каждого замечания:

1. Файл и строка
2. Почему проблема
3. Конкретный фикс

Если 0 замечаний — "Code review passed. Готов к human review / PR."

Типичные итерации: 1-2.
