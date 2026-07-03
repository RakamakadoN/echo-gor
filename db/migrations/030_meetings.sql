-- 030_meetings.sql
-- Раздел «Планёрки» (совещания сети).
-- Планёрка = дата + название + участники + текстовые итоги + история + поиск.
-- AI-слой: запись/заметки → транскрипт → итоги, задачи, ответственные, сроки.
-- Задачи планёрки хранятся отдельной таблицей (meeting_action_items), чтобы
-- их можно было отмечать выполненными и в будущем связать с модулем задач.
--
-- Доступ — как и везде — только через Express по SUPABASE_SERVICE_ROLE_KEY.
-- RLS включаем сразу (deny-by-default для anon/authenticated), service_role
-- его обходит (см. 008_security_rls.sql). Идемпотентно.
-- Применение: Supabase MCP apply_migration или supabase db push.

-- =========================================================================
-- Планёрка (совещание).
-- =========================================================================
CREATE TABLE IF NOT EXISTS meetings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,  -- NULL = вся сеть
  title            TEXT NOT NULL,                       -- название планёрки
  meeting_date     DATE NOT NULL DEFAULT CURRENT_DATE,  -- дата проведения
  participants     JSONB NOT NULL DEFAULT '[]'::jsonb,  -- ["Асланбек", "Магомед", ...]
  agenda           TEXT,                                -- повестка (необязательно)
  summary          TEXT,                                -- текстовые итоги (ручные или AI)
  transcript       TEXT,                                -- расшифровка записи / заметки
  audio_url        TEXT,                                -- ссылка/данные записи (на будущее)
  status           TEXT NOT NULL DEFAULT 'draft',       -- draft | held | archived
  created_by       TEXT,                                -- кто создал (имя)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meetings_org       ON meetings(organization_id);
CREATE INDEX IF NOT EXISTS idx_meetings_org_date  ON meetings(organization_id, meeting_date DESC);

-- =========================================================================
-- Задачи планёрки: что делать / кто ответственный / срок / выполнено.
-- =========================================================================
CREATE TABLE IF NOT EXISTS meeting_action_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id       UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,                       -- формулировка задачи
  assignee         TEXT,                                -- ответственный (имя)
  due_date         DATE,                                -- срок выполнения
  done             BOOLEAN NOT NULL DEFAULT false,      -- выполнено
  source           TEXT NOT NULL DEFAULT 'manual',      -- manual | ai
  sort             INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meeting_items_meeting ON meeting_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_items_org     ON meeting_action_items(organization_id);

-- =========================================================================
-- RLS: deny-by-default для anon/authenticated. service_role (сервер) обходит.
-- =========================================================================
ALTER TABLE meetings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_action_items ENABLE ROW LEVEL SECURITY;
