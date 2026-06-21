-- 010_lesson_reactions.sql
-- Раздел «Спасибо»: безопасные реакции учеников после занятия.
-- Это НЕ рейтинг преподавателей — фиксированный набор тёплых реакций,
-- ученик выбирает одну после занятия. Преподаватель видит признание,
-- владелец — вовлечённость, публичного соревнования нет.
-- Идемпотентно, RLS включён (сервер ходит через service_role — миграция 008).

BEGIN;

CREATE TABLE IF NOT EXISTS lesson_reactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  group_id        UUID REFERENCES groups(id) ON DELETE SET NULL,
  student_id      UUID REFERENCES students(id) ON DELETE SET NULL,
  lesson_id       UUID REFERENCES schedule_lessons(id) ON DELETE SET NULL,
  teacher_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  reaction_key    TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lesson_reactions_key_valid CHECK (reaction_key IN (
    'thanks_teacher', 'liked_lesson', 'was_interesting',
    'understood_move', 'got_better', 'want_more', 'hard_but_tried'
  ))
);

CREATE INDEX IF NOT EXISTS idx_lesson_reactions_group_id   ON lesson_reactions(group_id);
CREATE INDEX IF NOT EXISTS idx_lesson_reactions_teacher_id ON lesson_reactions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_reactions_created_at ON lesson_reactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_reactions_key        ON lesson_reactions(reaction_key);

ALTER TABLE lesson_reactions ENABLE ROW LEVEL SECURITY;

COMMIT;

COMMENT ON TABLE lesson_reactions IS 'Безопасные реакции учеников после занятия (раздел «Спасибо»). Фиксированный набор reaction_key, без публичного рейтинга преподавателей.';
