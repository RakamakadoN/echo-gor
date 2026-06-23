-- 020_teacher_card.sql
-- «Карточка педагога» у Владельца: зарплатные схемы, выплаты и чек-лист стажировки.
-- KPI/качество/группы/рейтинг считаются из существующих данных (students/groups/
-- payments/schedule_lessons), поэтому новые таблицы хранят только то, чего ещё нет.
-- Конвенции — как в 012/017/018: UUID PK, organization_id, RLS enable (сервер ходит
-- по service-role в обход RLS). teacher_id ссылается на users(id) (role='teacher').

-- Зарплатная схема педагога (одна на педагога в организации)
CREATE TABLE IF NOT EXISTS teacher_compensation (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  teacher_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheme           TEXT NOT NULL DEFAULT 'percent',     -- percent|per_lesson|fixed|mixed
  base_salary      NUMERIC(14,2) NOT NULL DEFAULT 0,    -- фикс/оклад за период
  percent          NUMERIC(5,2)  NOT NULL DEFAULT 0,    -- % от выручки групп
  per_lesson_rate  NUMERIC(14,2) NOT NULL DEFAULT 0,    -- ставка за проведённое занятие
  comment          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teacher_compensation_uniq UNIQUE (organization_id, teacher_id)
);

-- Журнал начислений/выплат педагогу
CREATE TABLE IF NOT EXISTS teacher_payouts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  teacher_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  amount           NUMERIC(14,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'planned',     -- planned|paid
  comment          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Чек-лист стажировки/онбординга педагога
CREATE TABLE IF NOT EXISTS teacher_onboarding (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  teacher_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  step_key         TEXT NOT NULL,
  title            TEXT NOT NULL,
  done             BOOLEAN NOT NULL DEFAULT false,
  done_at          TIMESTAMPTZ,
  sort             INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teacher_onboarding_uniq UNIQUE (organization_id, teacher_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_teacher_comp_org      ON teacher_compensation(organization_id);
CREATE INDEX IF NOT EXISTS idx_teacher_payouts_tch   ON teacher_payouts(organization_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_onboard_tch   ON teacher_onboarding(organization_id, teacher_id);

ALTER TABLE teacher_compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_payouts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_onboarding   ENABLE ROW LEVEL SECURITY;

-- Дефолтные данные для существующих педагогов (идемпотентно).
DO $$
DECLARE
  v_org UUID := '00000000-0000-0000-0000-000000000001';
  tch   RECORD;
BEGIN
  FOR tch IN SELECT id FROM users WHERE organization_id = v_org AND role = 'teacher' AND status <> 'archived' LOOP
    INSERT INTO teacher_compensation (organization_id, teacher_id, scheme, base_salary, percent, per_lesson_rate)
    VALUES (v_org, tch.id, 'percent', 0, 20, 2000)
    ON CONFLICT (organization_id, teacher_id) DO NOTHING;

    INSERT INTO teacher_onboarding (organization_id, teacher_id, step_key, title, done, done_at, sort) VALUES
      (v_org, tch.id, 'doc_signed',       'Подписан договор',              true,  now(), 1),
      (v_org, tch.id, 'intro_training',   'Пройдено вводное обучение',     true,  now(), 2),
      (v_org, tch.id, 'first_lesson',     'Проведено первое занятие',      true,  now(), 3),
      (v_org, tch.id, 'mentor_review',    'Оценка наставника',             false, NULL, 4),
      (v_org, tch.id, 'probation_passed', 'Испытательный срок пройден',    false, NULL, 5)
    ON CONFLICT (organization_id, teacher_id, step_key) DO NOTHING;
  END LOOP;
END $$;
