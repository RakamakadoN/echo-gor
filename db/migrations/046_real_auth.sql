-- 046_real_auth.sql
-- Реальная авторизация вместо демо-переключателя ролей.
--   • Сотрудники (users): отдельный ЛОГИН (не email) + до 2 филиалов ответственности.
--   • Ученики (students): персональный пароль, который ученик задаёт при первом входе
--     (вместо общего "12345"). password_set=false → при входе показываем экран
--     создания пароля; после — password_set=true и вход по своему паролю.
-- Все изменения аддитивные и идемпотентные (IF NOT EXISTS) — безопасно на проде.

-- ── Сотрудники ───────────────────────────────────────────────────────────────
-- login: короткий логин для входа (напр. номер телефона или ustaz01). Уникален.
ALTER TABLE users ADD COLUMN IF NOT EXISTS login TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login ON users(login) WHERE login IS NOT NULL;

-- branch_ids: до 2 филиалов, за которые отвечает сотрудник (управляющий, админ).
-- branch_id (single) остаётся основным/первым филиалом для обратной совместимости
-- со старыми фильтрами; branch_ids — источник истины для мультифилиальности.
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_ids UUID[] NOT NULL DEFAULT '{}';

-- Бэкофилл: у кого есть branch_id, но пустой branch_ids — переносим.
UPDATE users
   SET branch_ids = ARRAY[branch_id]
 WHERE branch_id IS NOT NULL
   AND (branch_ids IS NULL OR array_length(branch_ids, 1) IS NULL);

-- ── Ученики ──────────────────────────────────────────────────────────────────
-- Персональный пароль. NULL/password_set=false → первый вход без пароля,
-- система обязывает придумать пароль (пропустить нельзя).
ALTER TABLE students ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS password_set BOOLEAN NOT NULL DEFAULT false;
