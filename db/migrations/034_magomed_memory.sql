-- 034_magomed_memory.sql
-- Память чатов ИИ-ассистента «Магомед»: история диалога хранится 7 дней.
-- Ключ ветки (thread_key) = `${clientId}:${role}` — устройство (localStorage) + роль.
-- Записывает и читает server/magomedApi.ts (эндпоинты /api/gemini/magomed-chat
-- и /api/gemini/magomed-history). Хранилище на чтении фильтруется по 7 дням,
-- а строки старше 7 дней чистятся best-effort при каждом сохранении хода.
-- Идемпотентно (if not exists), безопасно применять и локально, и на проде.

CREATE TABLE IF NOT EXISTS magomed_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL,
  thread_key       TEXT NOT NULL,                 -- `${clientId}:${role}`
  role             TEXT NOT NULL,                 -- 'user' | 'assistant'
  content          TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_magomed_messages_thread
  ON magomed_messages(organization_id, thread_key, created_at);

ALTER TABLE magomed_messages ENABLE ROW LEVEL SECURITY;
