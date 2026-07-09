/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Телефон контакта: маска ввода и валидация. Школа в Алматы — номера формата
 * +7 (Казахстан/Россия), 11 цифр с ведущей 7. Ведущую 8 трактуем как 7
 * (привычный локальный ввод). Валидный номер обязателен при добавлении ученика,
 * чтобы в базу не попадали «просто цифры»/мусор.
 */

/** Только цифры, ведущая 8 → 7, максимум 11 цифр (код страны + номер). */
function digits11(raw: string): string {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("8")) d = "7" + d.slice(1);
  // Если ввели без кода страны (10 цифр, начиная с 7xx оператора) — добавим 7.
  if (d.length === 10 && !d.startsWith("7")) d = "7" + d;
  return d.slice(0, 11);
}

/**
 * Прогрессивная маска для инпута: превращает ввод в «+7 (7xx) xxx-xx-xx» по мере
 * набора. Пустая строка остаётся пустой (поле можно очистить).
 */
export function formatPhoneInput(raw: string): string {
  const d = digits11(raw);
  if (!d) return "";
  const rest = d.startsWith("7") ? d.slice(1) : d; // цифры после кода страны
  const a = rest.slice(0, 3);
  const b = rest.slice(3, 6);
  const c = rest.slice(6, 8);
  const e = rest.slice(8, 10);
  let out = "+7";
  if (a) out += ` (${a}`;
  if (a.length === 3) out += ")";
  if (b) out += ` ${b}`;
  if (c) out += `-${c}`;
  if (e) out += `-${e}`;
  return out;
}

/** Валиден, если ровно 11 цифр с ведущей 7 (полный +7-номер). */
export function isValidPhone(raw: string): boolean {
  const d = digits11(raw);
  return d.length === 11 && d.startsWith("7");
}

/** Нормализованный вид для отправки на сервер/хранения: «+77010001122». */
export function normalizePhone(raw: string): string {
  const d = digits11(raw);
  return d.length === 11 ? `+${d}` : String(raw || "").trim();
}
