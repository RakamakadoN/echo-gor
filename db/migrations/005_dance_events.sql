-- 005_dance_events.sql
-- Каталог внешних событий кавказского танца: турниры (дети/взрослые) и концерты.
-- Глобальный справочник (не привязан к организации) — наполняется парсером
-- (server/danceEventsParser.ts) и вручную через POST /api/mvp/dance-events.
-- Применено в Supabase (project dbwzagmdwfyldvtghzce) 2026-06-20.

create table if not exists public.dance_events (
  id            uuid primary key default gen_random_uuid(),
  event_type    text not null check (event_type in ('tournament','concert')),
  audience      text not null default 'all' check (audience in ('kids','adults','all')),
  title         text not null,
  organizer     text,                 -- федерация / промоутер / ансамбль
  city          text,
  country       text,                  -- KZ, RU, UZ, KG, BY, AZ, GE, AM, TJ
  venue         text,
  start_date    date,
  end_date      date,
  reg_deadline  date,                  -- дедлайн регистрации (для турниров)
  age_categories text,                 -- "8-11, 12-15, 16+"
  disciplines   text,                  -- "соло, дуэт, ансамбль"
  price         text,
  url           text,
  image         text,
  source        text not null,         -- ticketon | kassir | manual | ...
  source_uid    text,
  dedup_key     text not null unique,
  status        text not null default 'new' check (status in ('new','published','hidden')),
  raw           jsonb,
  first_seen_at timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists dance_events_type_idx    on public.dance_events (event_type);
create index if not exists dance_events_audience_idx on public.dance_events (audience);
create index if not exists dance_events_country_idx  on public.dance_events (country);
create index if not exists dance_events_start_idx    on public.dance_events (start_date);
create index if not exists dance_events_status_idx   on public.dance_events (status);

comment on table public.dance_events is 'Каталог внешних событий кавказского танца: турниры и концерты. Наполняется парсером (server/danceEventsParser.ts) и вручную.';
