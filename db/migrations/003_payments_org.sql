-- 003_payments_org.sql
-- Goal: Close the multi-tenancy gap missed in 002 — the `payments` table never
-- received an `organization_id` column, but server/mvpApi.ts filters and inserts
-- payments by organization_id. Without this column every payments query throws,
-- which makes /api/mvp/bootstrap fall back to mock data ("Supabase mode broken").
-- This is an additive, idempotent migration.

BEGIN;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON payments(organization_id);

COMMIT;
