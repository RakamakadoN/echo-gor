/**
 * Загрузка переменных окружения ДО любых других импортов сервера.
 *
 * Важно: модули server/mvpApi, server/geminiApi, server/magomedApi читают
 * process.env (SUPABASE_*, GEMINI_API_KEY, ANTHROPIC_API_KEY) на верхнем
 * уровне — в момент импорта.
 * Импорты вычисляются раньше тела server.ts, поэтому dotenv.config() нужно
 * вызвать в отдельном модуле, который импортируется ПЕРВЫМ. Иначе ключи будут
 * undefined и сервер уйдёт в mock/503.
 *
 * На Vercel переменные уже лежат в process.env (из настроек проекта), а файла
 * .env нет — dotenv.config() там просто ничего не делает, это безопасно.
 */
import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}
