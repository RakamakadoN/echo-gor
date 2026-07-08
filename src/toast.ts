/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Глобальные тосты — подтверждение успешного/неуспешного действия во всей системе.
 * Модульный стор без провайдера: любой код зовёт toast.success/error/info,
 * компонент <ToastHost/> (один в App) подписывается и рисует анимированные окна.
 */
export type ToastType = "success" | "error" | "info";
export interface ToastItem { id: number; type: ToastType; message: string }

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
let listeners: Listener[] = [];
let seq = 1;

function emit() { for (const l of listeners) l(items); }

export function subscribeToasts(l: Listener): () => void {
  listeners.push(l);
  l(items);
  return () => { listeners = listeners.filter((x) => x !== l); };
}

export function dismissToast(id: number): void {
  items = items.filter((t) => t.id !== id);
  emit();
}

export function pushToast(type: ToastType, message: string, ttl = 3500): number {
  const id = seq++;
  items = [...items, { id, type, message: String(message || "").trim() || (type === "error" ? "Ошибка" : "Готово") }];
  emit();
  if (ttl > 0) setTimeout(() => dismissToast(id), ttl);
  return id;
}

export const toast = {
  success: (m: string) => pushToast("success", m, 3000),
  error: (m: string) => pushToast("error", m, 6000),
  info: (m: string) => pushToast("info", m, 3500),
};
