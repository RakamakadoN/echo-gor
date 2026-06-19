# Парсер событий кавказского танца (турниры + концерты)

Каталог внешних событий, который наполняется автоматически (билетные агрегаторы)
и вручную (турниры федераций / Instagram). Две категории:

- **tournament** — турнир / чемпионат / первенство / кубок / конкурс.
  Аудитория: `kids` (дети/юниоры), `adults` (взрослые/18+), `all`.
- **concert** — концерт ансамбля кавказского танца.

## Файлы

| Файл | Назначение |
| --- | --- |
| `db/migrations/005_dance_events.sql` | Таблица `public.dance_events` (применена в Supabase) |
| `server/danceEventsParser.ts` | Ядро: классификация, нормализация, адаптеры, upsert |
| `server/danceEventsParser.test.ts` | Регрессионные тесты (34 проверки) |
| `server/mvpApi.ts` | REST-эндпоинты |

## REST API

```
GET  /api/mvp/dance-events?type=&audience=&country=&status=&q=
POST /api/mvp/dance-events/parse        (только owner) { dryRun?, maxDetailFetches? }
POST /api/mvp/dance-events              (только owner) ручное добавление
```

Фильтры GET: `type=tournament|concert`, `audience=kids|adults|all`,
`country=KZ,RU,...` (через запятую), `status=new|published|hidden`, `q=` (поиск по названию).

Запуск парсинга:
```bash
curl -X POST http://localhost:3000/api/mvp/dance-events/parse \
  -H "Content-Type: application/json" -H "x-demo-role: owner" \
  -d '{"dryRun": true}'        # dryRun — собрать без записи в БД
```

Ручное добавление турнира (которого нет в билетных системах):
```bash
curl -X POST http://localhost:3000/api/mvp/dance-events \
  -H "Content-Type: application/json" -H "x-demo-role: owner" \
  -d '{
    "title": "Кубок Кавказа по лезгинке — дети",
    "eventType": "tournament", "audience": "kids",
    "city": "Махачкала", "country": "RU",
    "dateText": "12-14 сентября", "organizer": "Федерация кавказского танца",
    "ageCategories": "8-11, 12-15", "regDeadline": "2026-09-01",
    "url": "https://instagram.com/..."
  }'
```

## Источники

**Автоматически (server-side, парсятся надёжно):**

- **Ticketon** (`ticketon.kz`) — Казахстан + СНГ (Бишкек, Ташкент, Душанбе).
  Раздел `/{city}/concerts`. Список городов — `TICKETON_CITIES`.
- **Kassir** (`kassir.ru`) — Россия (Москва, СПб). Список — `KASSIR_CITIES`.

Из агрегаторов автоматически вылавливаются **и концерты, и билетные турниры/конкурсы**:
тип определяется по названию (`классифицируется` как `tournament`, если есть «турнир»,
«чемпионат», «кубок», «конкурс» и т.п.).

**Вручную (`manualSeed` в `danceEventsParser.ts` или POST-эндпоинт):**
большинство турниров по кавказским танцам организуют федерации и проводятся
через Instagram/VK — чистых машиночитаемых календарей по ним нет. Их добавляют вручную.

### Как работает фильтр «кавказский танец»

Событие проходит, если название (кириллица) или URL-slug (транслит) содержит маркер
из словарей `CAUCASUS_KEYWORDS_CYR` / `CAUCASUS_KEYWORDS_TRANSLIT`
(лезгинка, кавказ, горцы, вайнах, ватан, нальмэс, дагестан, осетин… + названия ансамблей).
Чтобы расширить охват — дополняйте эти массивы.

## Как добавить новый источник

Реализуйте `SourceAdapter` (см. `ticketonAdapter` как образец) и добавьте его в
`defaultAdapters()`. Адаптер возвращает `RawCandidate[]`; раннер сам отфильтрует,
классифицирует, дедуплицирует (по `dedup_key`) и сделает upsert.

## Тесты

```bash
npx tsx server/danceEventsParser.test.ts
```

## Примечания

- Парсинг запускайте на dev-сервере (`npm run dev`) — там работает сетевой `fetch`.
- Upsert идёт по `dedup_key`; поле `status` при повторном парсинге **не перезаписывается**
  (правки публикации оператора сохраняются).
- Таблица `dance_events` — это серверный справочник: доступ только через бэкенд
  (service-role ключ). RLS на ней выключена, как и на остальных таблицах MVP;
  это безопасно, пока к Supabase не обращаются напрямую с anon-ключом из браузера.
```
