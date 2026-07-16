/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Адаптер ApiPay (apipay.kz) — посредник для выставления счетов Kaspi Pay.
 * СРМ — источник правды (кому/сколько/когда); отсюда только две команды:
 * «выставь счёт» и «проверь/эмулируй статус». Оплату подтверждает вебхук
 * (см. POST /api/apipay/webhook в mvpApi.ts) с подписью HMAC-SHA256.
 *
 * Провайдер — сменная деталь: при переходе на другого посредника меняется
 * только этот файл, СРМ-эндпоинты остаются как есть.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const BASE_URL = () => process.env.APIPAY_BASE_URL || "https://api.apipay.kz/api/v1";
const API_KEY = () => process.env.APIPAY_API_KEY || "";
const WEBHOOK_SECRET = () => process.env.APIPAY_WEBHOOK_SECRET || "";

export const apipayConfigured = () => Boolean(API_KEY());
export const apipayWebhookConfigured = () => Boolean(WEBHOOK_SECRET());

async function apipayFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY(),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* не-JSON ответ */ }
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || json?.error || text || `HTTP ${res.status}`;
    throw new Error(`ApiPay ${res.status}: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
  }
  return json as T;
}

// Телефон для ApiPay — строго 8XXXXXXXXXX (без +7, скобок и пробелов).
export function normalizeKaspiPhone(raw: string): string | null {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    return "8" + digits.slice(1);
  }
  if (digits.length === 10 && digits.startsWith("7")) return "8" + digits;
  return null;
}

export interface ApipayInvoice {
  id: number | string;
  status: string; // processing|pending|paid|cancelled|expired|error|partially_refunded
  amount?: string | number;
  phone_number?: string;
  paid_at?: string | null;
  [key: string]: any;
}

// POST /invoices возвращает 201 со статусом processing; финальный статус — вебхуком.
export async function apipayCreateInvoice(input: {
  phone_number: string;
  amount: number;
  description?: string;
  external_order_id?: string;
}): Promise<ApipayInvoice> {
  const raw = await apipayFetch<any>("/invoices", { method: "POST", body: JSON.stringify(input) });
  return (raw?.invoice ?? raw?.data ?? raw) as ApipayInvoice;
}

export async function apipayGetInvoice(id: string | number): Promise<ApipayInvoice> {
  const raw = await apipayFetch<any>(`/invoices/${id}`);
  return (raw?.invoice ?? raw?.data ?? raw) as ApipayInvoice;
}

export async function apipayCancelInvoice(id: string | number): Promise<any> {
  return apipayFetch<any>(`/invoices/${id}/cancel`, { method: "POST", body: "{}" });
}

// Песочница: принудительно перевести счёт в статус (paid и т.п.) для теста цепочки.
export async function apipaySimulateStatus(id: string | number, status: string): Promise<any> {
  return apipayFetch<any>(`/invoices/${id}/simulate-status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

// Подпись вебхука: X-Webhook-Signature: sha256=<hex HMAC-SHA256(rawBody, secret)>.
// Считаем от СЫРОГО тела (до JSON.parse) и сравниваем в постоянном времени.
export function apipayVerifySignature(rawBody: Buffer | undefined, signatureHeader: string): boolean {
  const secret = WEBHOOK_SECRET();
  if (!secret || !rawBody || !signatureHeader) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signatureHeader));
  return a.length === b.length && timingSafeEqual(a, b);
}
