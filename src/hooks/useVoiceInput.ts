/**
 * useVoiceInput — переиспользуемый голосовой ввод через браузерный Web Speech
 * API (ru-RU). Наговор пишется «на лету» в поле ввода компонента: одна фраза
 * (continuous=false — распознавание само завершается после паузы), interim-
 * результаты показывают текст по мере произнесения. Юзер правит и отправляет
 * вручную. Тот же подход, что в виджете Магомеда и модуле «Планёрки».
 *
 * Использование:
 *   const voice = useVoiceInput(() => input, setInput);
 *   <button onClick={voice.toggle}>🎙</button>  // voice.recording / voice.error
 *
 * Работает в Chrome/Edge; в Safari частично, в Firefox нет — тогда supported=false
 * и toggle() выставит понятную подсказку в error.
 */
import { useEffect, useRef, useState } from "react";

export type VoiceInput = {
  recording: boolean;
  error: string | null;
  supported: boolean;
  toggle: () => void;
  stop: () => void;
};

function getSR(): any {
  if (typeof window === "undefined") return null;
  return (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition || null;
}

export function useVoiceInput(
  /** Текущее значение поля до старта записи — к нему дописываем распознанное. */
  getBase: () => string,
  /** Куда класть результат (обычно setState поля ввода). */
  onText: (text: string) => void
): VoiceInput {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<any>(null);
  const baseRef = useRef("");
  // Свежие ссылки на колбэки — чтобы не пересоздавать распознаватель.
  const onTextRef = useRef(onText);
  const getBaseRef = useRef(getBase);
  onTextRef.current = onText;
  getBaseRef.current = getBase;

  function stop() {
    try {
      recRef.current?.stop();
    } catch {
      /* уже остановлено */
    }
    recRef.current = null;
    setRecording(false);
  }

  function toggle() {
    if (recording) {
      stop();
      return;
    }
    const SR = getSR();
    if (!SR) {
      setError("Голосовой ввод поддерживается в Chrome. Наберите запрос вручную.");
      return;
    }
    setError(null);
    const base = getBaseRef.current();
    baseRef.current = base ? base.trim() + " " : "";
    const rec = new SR();
    rec.lang = "ru-RU";
    rec.continuous = false;
    rec.interimResults = true;
    let finalBuf = "";
    rec.onresult = (ev: any) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalBuf += t + " ";
        else interim += t;
      }
      onTextRef.current((baseRef.current + finalBuf + interim).trimStart());
    };
    rec.onerror = (e: any) => {
      const code = e?.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        setError("Нет доступа к микрофону. Разрешите его в настройках браузера.");
      } else if (code !== "aborted" && code !== "no-speech") {
        setError("Ошибка распознавания речи. Попробуйте ещё раз.");
      }
      setRecording(false);
    };
    rec.onend = () => {
      if (recRef.current === rec) {
        recRef.current = null;
        setRecording(false);
      }
    };
    recRef.current = rec;
    try {
      rec.start();
      setRecording(true);
    } catch {
      setError("Не удалось начать запись.");
      setRecording(false);
    }
  }

  // Останавливаем распознавание при размонтировании компонента.
  useEffect(
    () => () => {
      try {
        recRef.current?.stop();
      } catch {
        /* noop */
      }
    },
    []
  );

  return { recording, error, supported: Boolean(getSR()), toggle, stop };
}
