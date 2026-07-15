import React from "react";

// Корневой перехватчик рантайм-ошибок. Без него любая необработанная ошибка в
// дереве компонентов роняла всё приложение в белый экран без объяснения (аудит #47).
// Здесь показываем спокойный экран «что-то пошло не так» с кнопкой перезагрузки.
type Props = { children: React.ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Логируем в консоль для диагностики; сюда же можно подключить внешний трекер.
    console.error("[ErrorBoundary] Необработанная ошибка интерфейса:", error, info);
  }

  handleReload = () => {
    // Мягкая перезагрузка — состояние приложения не переживает F5 всё равно.
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#0f1216",
          color: "#e9edf1",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <div style={{ maxWidth: 440, textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }} aria-hidden="true">
            ⚠️
          </div>
          <h1 style={{ fontSize: 22, margin: "0 0 8px", fontWeight: 700 }}>
            Что-то пошло не так
          </h1>
          <p style={{ margin: "0 0 20px", color: "#9aa4ad", lineHeight: 1.5 }}>
            Произошла ошибка в интерфейсе. Данные не потеряны — обновите страницу,
            чтобы продолжить работу. Если ошибка повторяется, сообщите в поддержку.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              appearance: "none",
              border: "none",
              borderRadius: 10,
              padding: "11px 22px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              background: "#d9a441",
              color: "#1a1206",
            }}
          >
            Перезагрузить
          </button>
          {import.meta.env.DEV && this.state.message ? (
            <pre
              style={{
                marginTop: 20,
                textAlign: "left",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 12,
                color: "#7f8a95",
                background: "#171b20",
                padding: "12px 14px",
                borderRadius: 8,
              }}
            >
              {this.state.message}
            </pre>
          ) : null}
        </div>
      </div>
    );
  }
}
