-- 009_teacher_notes_homework.sql
-- Педагогический слой преподавателя: заметки/похвала по ученикам и домашние задания.
-- Контекст: фронт ходит только через Express (service_role), RLS включаем
-- по соглашению миграции 008 (deny-by-default для anon/authenticated).
-- Идемпотентно: CREATE TABLE IF NOT EXISTS + повторно-безопасные индексы/политики.

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- 1) teacher_notes — заметки преподавателя по ученику (note / praise / concern)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  author_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  kind            TEXT NOT NULL DEFAULT 'note',
  content         TEXT NOT NULL,
  is_private      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teacher_notes_kind_valid CHECK (kind IN ('note', 'praise', 'concern')),
  CONSTRAINT teacher_notes_content_not_blank CHECK (length(btrim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_teacher_notes_student_id ON teacher_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_author_id  ON teacher_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_created_at ON teacher_notes(created_at DESC);

-- ──────────────────────────────────────────────────────────────────────────
-- 2) homework — домашние задания (индивидуальные на ученика или на группу)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS homework (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id              UUID REFERENCES branches(id) ON DELETE SET NULL,
  student_id             UUID REFERENCES students(id) ON DELETE CASCADE,
  group_id               UUID REFERENCES groups(id) ON DELETE CASCADE,
  author_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  title                  TEXT NOT NULL,
  description            TEXT,
  video_url              TEXT,
  status                 TEXT NOT NULL DEFAULT 'assigned',
  due_at                 TIMESTAMPTZ,
  submission_note        TEXT,
  submission_video_url   TEXT,
  submitted_at           TIMESTAMPTZ,
  graded_at              TIMESTAMPTZ,
  grade_comment          TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT homework_status_valid CHECK (status IN ('assigned', 'submitted', 'done', 'archived')),
  CONSTRAINT homework_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT homework_target_present CHECK (student_id IS NOT NULL OR group_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_homework_student_id ON homework(student_id);
CREATE INDEX IF NOT EXISTS idx_homework_group_id   ON homework(group_id);
CREATE INDEX IF NOT EXISTS idx_homework_author_id  ON homework(author_id);
CREATE INDEX IF NOT EXISTS idx_homework_status     ON homework(status);

-- ──────────────────────────────────────────────────────────────────────────
-- 3) updated_at автообновление (переиспользуем функцию из схемы 001, если есть)
-- ──────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    DROP TRIGGER IF EXISTS trg_teacher_notes_updated_at ON teacher_notes;
    CREATE TRIGGER trg_teacher_notes_updated_at BEFORE UPDATE ON teacher_notes
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    DROP TRIGGER IF EXISTS trg_homework_updated_at ON homework;
    CREATE TRIGGER trg_homework_updated_at BEFORE UPDATE ON homework
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 4) RLS: включаем deny-by-default (server ходит через service_role, обходит RLS).
--    Соответствует философии миграции 008.
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE teacher_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework      ENABLE ROW LEVEL SECURITY;

COMMIT;

COMMENT ON TABLE teacher_notes IS 'Заметки преподавателя по ученику: наблюдения, похвала (praise), зоны внимания (concern).';
COMMENT ON TABLE homework IS 'Домашние задания преподавателя: индивидуальные (student_id) или групповые (group_id), со статусом и сдачей.';
