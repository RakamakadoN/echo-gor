-- 002_ehogor_multi_tenancy.sql
-- Goal: Add Organizations, Guardians, N:N Groups, Finance Transactions and Messaging.
-- This is an additive migration.

BEGIN;

-- 1. Organizations (Multi-tenancy root)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status record_status NOT NULL DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Guardians (Parents/Legal Reps)
CREATE TABLE IF NOT EXISTS guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  telegram TEXT,
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Junction Table: Students <-> Guardians (N:N)
CREATE TABLE IF NOT EXISTS student_guardians (
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  relationship_type TEXT, -- 'father', 'mother', 'relative'
  is_primary BOOLEAN DEFAULT false,
  PRIMARY KEY (student_id, guardian_id)
);

-- 4. Junction Table: Students <-> Groups (N:N)
CREATE TABLE IF NOT EXISTS group_students (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  joined_at DATE DEFAULT CURRENT_DATE,
  status record_status NOT NULL DEFAULT 'active',
  PRIMARY KEY (group_id, student_id)
);

-- 5. Finance Transactions
CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id UUID REFERENCES branches(id),
  student_id UUID REFERENCES students(id),
  payment_id UUID REFERENCES payments(id),
  amount NUMERIC(12, 2) NOT NULL,
  type TEXT NOT NULL, -- 'income', 'expense', 'debit'
  category TEXT, -- 'tuition', 'uniform', 'rent'
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Add organization_id to existing tables
ALTER TABLE branches ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 7. Staff Profiles for Teachers
CREATE TABLE IF NOT EXISTS staff_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  specialization TEXT[],
  experience_years INTEGER,
  photo_url TEXT,
  rating NUMERIC(3,2) DEFAULT 5.0
);

-- 8. Messages & Recipients
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  sender_id UUID REFERENCES users(id),
  title TEXT,
  body TEXT NOT NULL,
  type TEXT NOT NULL, -- 'announcement', 'direct', 'notification'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  student_id UUID REFERENCES students(id),
  read_at TIMESTAMPTZ,
  CHECK ((user_id IS NOT NULL) OR (student_id IS NOT NULL))
);

-- Partial unique indexes for message_recipients
CREATE UNIQUE INDEX IF NOT EXISTS idx_msg_rec_user_unique ON message_recipients (message_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_msg_rec_student_unique ON message_recipients (message_id, student_id) WHERE student_id IS NOT NULL;

-- 9. Additional Indexes for performance and multi-tenancy
CREATE INDEX IF NOT EXISTS idx_branches_organization_id ON branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_groups_organization_id ON groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_students_organization_id ON students(organization_id);
CREATE INDEX IF NOT EXISTS idx_guardians_organization_id ON guardians(organization_id);

CREATE INDEX IF NOT EXISTS idx_group_students_student_id ON group_students(student_id);
CREATE INDEX IF NOT EXISTS idx_group_students_group_id ON group_students(group_id);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_organization_id ON finance_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_student_id ON finance_transactions(student_id);

CREATE INDEX IF NOT EXISTS idx_payments_student_id_new ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id_new ON attendance(student_id);

COMMIT;
