-- Echo Gor 1.0 MVP database schema.
-- Scope: operational CRM only. No AI, achievements, or parent cabinet.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM (
  'owner',
  'branch_manager',
  'admin',
  'teacher'
);

CREATE TYPE record_status AS ENUM (
  'active',
  'inactive',
  'archived'
);

CREATE TYPE student_status AS ENUM (
  'lead',
  'trial',
  'active',
  'paused',
  'debt',
  'left',
  'archived'
);

CREATE TYPE lesson_status AS ENUM (
  'scheduled',
  'completed',
  'cancelled'
);

CREATE TYPE attendance_status AS ENUM (
  'present',
  'absent',
  'sick',
  'unknown'
);

CREATE TYPE payment_method AS ENUM (
  'cash',
  'card',
  'transfer',
  'kaspi',
  'other'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'cancelled',
  'refunded'
);

CREATE TYPE invoice_status AS ENUM (
  'draft',
  'sent',
  'paid',
  'overdue',
  'cancelled'
);

CREATE TYPE task_status AS ENUM (
  'new',
  'in_progress',
  'done',
  'cancelled',
  'overdue'
);

CREATE TYPE task_priority AS ENUM (
  'low',
  'normal',
  'high'
);

CREATE TYPE notification_channel AS ENUM (
  'sms',
  'whatsapp',
  'email',
  'telegram'
);

CREATE TYPE notification_status AS ENUM (
  'queued',
  'sent',
  'delivered',
  'failed',
  'cancelled'
);

CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  manager_id UUID,
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
  role user_role NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  specialization TEXT,
  status record_status NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (email)
);

ALTER TABLE branches
  ADD CONSTRAINT branches_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE halls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 0,
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT halls_capacity_non_negative CHECK (capacity >= 0),
  CONSTRAINT halls_branch_name_unique UNIQUE (branch_id, name)
);

CREATE TABLE lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lead_sources_name_unique UNIQUE (name)
);

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  hall_id UUID REFERENCES halls(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  age_from INTEGER,
  age_to INTEGER,
  capacity INTEGER NOT NULL DEFAULT 0,
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT groups_capacity_non_negative CHECK (capacity >= 0),
  CONSTRAINT groups_age_range_valid CHECK (
    age_from IS NULL
    OR age_to IS NULL
    OR age_from <= age_to
  ),
  CONSTRAINT groups_branch_name_unique UNIQUE (branch_id, name)
);

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  source_id UUID REFERENCES lead_sources(id) ON DELETE SET NULL,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  birthday DATE,
  phone TEXT,
  email TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  status student_status NOT NULL DEFAULT 'lead',
  medical_certificate_until DATE,
  insurance_until DATE,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lessons_count INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscription_plans_lessons_positive CHECK (lessons_count > 0),
  CONSTRAINT subscription_plans_duration_positive CHECK (duration_days > 0),
  CONSTRAINT subscription_plans_price_non_negative CHECK (price >= 0),
  CONSTRAINT subscription_plans_name_unique UNIQUE (name)
);

CREATE TABLE student_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  lessons_total INTEGER NOT NULL,
  lessons_left INTEGER NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT student_subscriptions_dates_valid CHECK (starts_on <= ends_on),
  CONSTRAINT student_subscriptions_lessons_valid CHECK (
    lessons_total >= 0
    AND lessons_left >= 0
    AND lessons_left <= lessons_total
  ),
  CONSTRAINT student_subscriptions_money_valid CHECK (
    price >= 0
    AND discount_amount >= 0
  )
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  subscription_id UUID REFERENCES student_subscriptions(id) ON DELETE SET NULL,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  number TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_on DATE,
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT invoices_amount_non_negative CHECK (amount >= 0),
  CONSTRAINT invoices_number_unique UNIQUE (number)
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'paid',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  comment TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payments_amount_non_negative CHECK (amount >= 0)
);

CREATE TABLE schedule_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  hall_id UUID REFERENCES halls(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status lesson_status NOT NULL DEFAULT 'scheduled',
  comment TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT schedule_lessons_time_valid CHECK (starts_at < ends_at)
);

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES schedule_lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  subscription_id UUID REFERENCES student_subscriptions(id) ON DELETE SET NULL,
  status attendance_status NOT NULL DEFAULT 'unknown',
  marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  marked_at TIMESTAMPTZ,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT attendance_lesson_student_unique UNIQUE (lesson_id, student_id)
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'new',
  priority task_priority NOT NULL DEFAULT 'normal',
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  channel notification_channel NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status notification_status NOT NULL DEFAULT 'queued',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_branch_id ON users(branch_id);
CREATE INDEX idx_users_status ON users(status);

CREATE INDEX idx_branches_status ON branches(status);
CREATE INDEX idx_halls_branch_id ON halls(branch_id);
CREATE INDEX idx_groups_branch_id ON groups(branch_id);
CREATE INDEX idx_groups_teacher_id ON groups(teacher_id);
CREATE INDEX idx_groups_status ON groups(status);

CREATE INDEX idx_students_branch_id ON students(branch_id);
CREATE INDEX idx_students_group_id ON students(group_id);
CREATE INDEX idx_students_source_id ON students(source_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_parent_phone ON students(parent_phone);
CREATE INDEX idx_students_phone ON students(phone);
CREATE INDEX idx_students_full_name ON students(last_name, first_name, middle_name);

CREATE INDEX idx_student_subscriptions_student_id ON student_subscriptions(student_id);
CREATE INDEX idx_student_subscriptions_branch_id ON student_subscriptions(branch_id);
CREATE INDEX idx_student_subscriptions_group_id ON student_subscriptions(group_id);
CREATE INDEX idx_student_subscriptions_status ON student_subscriptions(status);
CREATE INDEX idx_student_subscriptions_ends_on ON student_subscriptions(ends_on);

CREATE INDEX idx_invoices_student_id ON invoices(student_id);
CREATE INDEX idx_invoices_branch_id ON invoices(branch_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_on ON invoices(due_on);

CREATE INDEX idx_payments_branch_paid_at ON payments(branch_id, paid_at);
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_status ON payments(status);

CREATE INDEX idx_schedule_lessons_branch_starts_at ON schedule_lessons(branch_id, starts_at);
CREATE INDEX idx_schedule_lessons_group_starts_at ON schedule_lessons(group_id, starts_at);
CREATE INDEX idx_schedule_lessons_teacher_starts_at ON schedule_lessons(teacher_id, starts_at);
CREATE INDEX idx_schedule_lessons_status ON schedule_lessons(status);

CREATE INDEX idx_attendance_lesson_id ON attendance(lesson_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_status ON attendance(status);

CREATE INDEX idx_tasks_branch_id ON tasks(branch_id);
CREATE INDEX idx_tasks_student_id ON tasks(student_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status_due_at ON tasks(status, due_at);

CREATE INDEX idx_notifications_branch_id ON notifications(branch_id);
CREATE INDEX idx_notifications_student_id ON notifications(student_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled_at ON notifications(scheduled_at);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_branch_id ON audit_logs(branch_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
