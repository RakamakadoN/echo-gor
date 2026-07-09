/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Мини-шина «перезагрузить данные приложения». Модульный стор без провайдера
 * (та же идиома, что в toast.ts / statusConfig.ts): компоненты в глубине дерева
 * зовут requestDataRefresh(), а App подписан и перезагружает bootstrap.
 *
 * Зачем: часть мутаций фронт делает НАПРЯМУЮ по API, минуя хендлеры App
 * (напр. удаление абонемента внутри карточки ученика). Без обновления глобального
 * списка изменение «воскресает» при повторном открытии карточки — данные-то в
 * App остались прежними. Шина закрывает этот разрыв одним вызовом, без протяжки
 * колбэка через все воркспейсы/вью.
 */
type Listener = () => void;

let listeners: Listener[] = [];

export function subscribeDataRefresh(l: Listener): () => void {
  listeners.push(l);
  return () => { listeners = listeners.filter((x) => x !== l); };
}

export function requestDataRefresh(): void {
  for (const l of listeners) {
    try { l(); } catch { /* подписчик упал — не мешаем остальным */ }
  }
}
