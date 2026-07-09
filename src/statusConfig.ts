/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * statusConfig — пользовательская настройка отображения статусов.
 * Хранит переопределения названий и цветов базовых статусов (KPI + воронка)
 * и список ручных статусов. Персистится в localStorage (устройство владельца).
 */
import { DEFAULT_MANUAL_STATUSES } from "./studentSegments";

export type StatusTone = "gray" | "green" | "orange" | "red" | "blue" | "purple";

export const STATUS_TONES: { id: StatusTone; label: string; swatch: string }[] = [
  { id: "gray", label: "Серый", swatch: "#5C6772" },
  { id: "green", label: "Зелёный", swatch: "#22C55E" },
  { id: "orange", label: "Оранжевый", swatch: "#F97316" },
  { id: "red", label: "Красный", swatch: "#EF4444" },
  { id: "blue", label: "Синий", swatch: "#3B82F6" },
  { id: "purple", label: "Фиолетовый", swatch: "#8B5CF6" },
];

/** Цветовая схема карточки воронки по тону. */
export const TONE_FUNNEL: Record<StatusTone, { bg: string; border: string; icon_c: string; val: string; hint_c: string }> = {
  gray: { bg: "#EDF1F5", border: "#DCE2E8", icon_c: "#5C6772", val: "#5C6772", hint_c: "#6B7682" },
  green: { bg: "#F0FDF4", border: "#BBF7D0", icon_c: "#22C55E", val: "#15803D", hint_c: "#16A34A" },
  orange: { bg: "#FFF7ED", border: "#FED7AA", icon_c: "#F97316", val: "#C2410C", hint_c: "#EA580C" },
  red: { bg: "#FFF5F5", border: "#FECACA", icon_c: "#EF4444", val: "#B91C1C", hint_c: "#DC2626" },
  blue: { bg: "#EFF6FF", border: "#BFDBFE", icon_c: "#3B82F6", val: "#1E40AF", hint_c: "#2563EB" },
  purple: { bg: "#F8F6FF", border: "#DDD6FE", icon_c: "#8B5CF6", val: "#5B21B6", hint_c: "#7C3AED" },
};

/** Базовые статусы блока «Основные показатели». */
export const BASE_KPI_STATUSES: { key: string; label: string; tone: StatusTone }[] = [
  { key: "total", label: "Всего учеников", tone: "gray" },
  { key: "active", label: "Активные", tone: "green" },
  { key: "renewal", label: "Требуют продления", tone: "orange" },
  { key: "debtors", label: "Должники", tone: "red" },
  { key: "nostatus", label: "Без статуса", tone: "blue" },
  { key: "waitlist", label: "Лист ожидания", tone: "purple" },
  { key: "left", label: "Ушли в этом месяце", tone: "red" },
];

/** Базовые статусы блока «Воронка продаж». */
export const BASE_FUNNEL_STATUSES: { key: string; label: string; tone: StatusTone }[] = [
  { key: "funnel:lead", label: "Без статуса", tone: "purple" },
  { key: "funnel:trial", label: "Записаны на пробный", tone: "blue" },
  { key: "funnel:trial_missed", label: "Не пришли на пробный", tone: "red" },
  { key: "funnel:trial_rebooked", label: "Перезаписаны", tone: "orange" },
  { key: "funnel:trial_lost", label: "Были, не купили", tone: "orange" },
  { key: "funnel:visitor_new", label: "Купили абонемент", tone: "green" },
];

/** Авто-статусы ученика (то, что система считает сама) — для перекраски на
 *  дашборде «Авто-статусы учеников». Ключи = statusKey из getStudentState. */
export const AUTO_STATUS_LIST: { key: string; label: string; tone: StatusTone }[] = [
  { key: "lead", label: "Новый лид", tone: "purple" },
  { key: "trial", label: "Записан на пробный", tone: "blue" },
  { key: "trial_missed", label: "Не пришёл на пробный", tone: "red" },
  { key: "trial_rebooked", label: "Перезаписан на пробный", tone: "orange" },
  { key: "trial_lost", label: "Был на пробном, не купил", tone: "orange" },
  { key: "visitor_new", label: "Новый посетитель", tone: "green" },
  { key: "not_renewed", label: "Требуют продления", tone: "red" },
  { key: "debt_current", label: "Не оплачен текущий месяц", tone: "red" },
  { key: "debt_prev", label: "Не оплачен прошлый месяц", tone: "red" },
  { key: "debt_partial", label: "Частичный долг", tone: "orange" },
  { key: "next_paid", label: "Куплен следующий месяц", tone: "green" },
  { key: "new", label: "Новый ученик", tone: "blue" },
  { key: "active", label: "Активный", tone: "green" },
  { key: "returned", label: "Вернувшийся", tone: "purple" },
  { key: "paused", label: "Замороженный абонемент", tone: "gray" },
  { key: "manual", label: "Ручной статус", tone: "gray" },
];

const AUTO_STATUS_DEFAULT_TONE: Record<string, StatusTone> = Object.fromEntries(
  AUTO_STATUS_LIST.map((s) => [s.key, s.tone])
);

/** Тон-цвет (hex) статуса по ключу: переопределение из конфига, иначе дефолт. */
export function statusSwatch(key: string, fallbackTone: StatusTone = "gray"): string {
  const tone = getStatusToneRaw(key) || AUTO_STATUS_DEFAULT_TONE[key] || fallbackTone;
  return STATUS_TONES.find((t) => t.id === tone)?.swatch || "#5C6772";
}

export interface StatusConfig {
  labels: Record<string, string>;
  tones: Record<string, StatusTone>;
  manual: string[];
}

const STORAGE_KEY = "echogor:status-config:v1";

function readLocal(): StatusConfig {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      labels: parsed.labels || {},
      tones: parsed.tones || {},
      manual: Array.isArray(parsed.manual) ? parsed.manual : [],
    };
  } catch {
    return { labels: {}, tones: {}, manual: [] };
  }
}

// Модульный кэш — чтобы чтения статусов (getManualStatuses и т.д.) оставались
// синхронными в рендере. Инициализируется из localStorage, обновляется общим
// конфигом организации с сервера (fetchStatusConfig).
let _cache: StatusConfig | null = null;

export function loadStatusConfig(): StatusConfig {
  if (!_cache) _cache = readLocal();
  return _cache;
}

/** Обновить кэш + localStorage (без записи на сервер). */
export function hydrateStatusConfig(cfg: Partial<StatusConfig>): void {
  _cache = {
    labels: cfg.labels || {},
    tones: (cfg.tones as Record<string, StatusTone>) || {},
    manual: Array.isArray(cfg.manual) ? cfg.manual : [],
  };
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(_cache)); } catch { /* noop */ }
}

/** Загрузить общий конфиг организации с сервера в кэш (при старте/смене роли). */
export async function fetchStatusConfig(roleHeader: string): Promise<void> {
  try {
    const res = await fetch("/api/mvp/settings/status-config", { headers: { "x-demo-role": roleHeader } });
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.config && typeof data.config === "object") hydrateStatusConfig(data.config);
  } catch { /* оставляем локальный кэш */ }
}

/** Сохранить конфиг: кэш + localStorage + общий стор на сервере. */
export function saveStatusConfig(cfg: StatusConfig, roleHeader = "owner"): void {
  hydrateStatusConfig(cfg);
  try {
    fetch("/api/mvp/settings/status-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-demo-role": roleHeader },
      body: JSON.stringify({ config: cfg }),
    }).catch(() => { /* локально уже сохранено */ });
  } catch { /* noop */ }
}

/** Отображаемое название статуса (переопределение или значение по умолчанию). */
export function getStatusLabel(key: string, fallback: string): string {
  const v = loadStatusConfig().labels[key];
  return v && v.trim() ? v : fallback;
}

/** Переопределённый тон статуса (или undefined — тогда берётся цвет по умолчанию). */
export function getStatusToneRaw(key: string): StatusTone | undefined {
  return loadStatusConfig().tones[key];
}

/** Список ручных статусов (пользовательский или по умолчанию). */
export function getManualStatuses(): string[] {
  const cfg = loadStatusConfig();
  return cfg.manual && cfg.manual.length ? cfg.manual : DEFAULT_MANUAL_STATUSES;
}
