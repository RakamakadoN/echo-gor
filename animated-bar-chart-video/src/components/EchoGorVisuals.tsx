import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { MetricItem, VideoScene } from "../data/videoTypes";

export const theme = {
  black: "#050505",
  ink: "#0B0B0D",
  graphite: "#151519",
  gold: "#D6AE55",
  goldDeep: "#9C742D",
  cream: "#F3EBDD",
  muted: "#AFA699",
  burgundy: "#4B1119",
  emerald: "#102C24",
};

const fontStack =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const resolveFormat = (format: string) => {
  if (format === "landscape-16x9") return { width: 1920, height: 1080 };
  if (format === "square-1x1") return { width: 1080, height: 1080 };
  return { width: 1080, height: 1920 };
};

export const FadeIn: React.FC<{ children: ReactNode; delay?: number; y?: number; style?: CSSProperties }> = ({
  children,
  delay = 0,
  y = 24,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 180, stiffness: 80, mass: 0.8 },
  });

  return (
    <div
      style={{
        opacity: interpolate(progress, [0, 1], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${interpolate(progress, [0, 1], [y, 0], {
          extrapolateRight: "clamp",
        })}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const StageBackdrop: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const sweep = interpolate(frame % 180, [0, 90, 180], [-width * 0.25, width * 0.65, width * 1.1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const mountainPath = `polygon(0 ${height}px, 0 ${height * 0.7}px, ${width * 0.14}px ${height * 0.61}px, ${width * 0.28}px ${height * 0.68}px, ${width * 0.42}px ${height * 0.54}px, ${width * 0.6}px ${height * 0.69}px, ${width * 0.76}px ${height * 0.58}px, ${width}px ${height * 0.72}px, ${width}px ${height}px)`;

  return (
    <AbsoluteFill style={{ background: theme.black, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 12%, rgba(214,174,85,0.20), transparent 34%), linear-gradient(145deg, #050505 0%, #111114 48%, #18080b 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.42 * intensity,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(214,174,85,0.12) 50%, transparent 100%)",
          transform: `translateX(${sweep}px) skewX(-16deg)`,
          width: width * 0.4,
          filter: "blur(28px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: height * 0.38,
          clipPath: mountainPath,
          background: "linear-gradient(180deg, rgba(214,174,85,0.16), rgba(0,0,0,0.74))",
          opacity: 0.78,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "96px 96px",
          maskImage: "radial-gradient(circle at 50% 38%, black, transparent 78%)",
          opacity: 0.34,
        }}
      />
    </AbsoluteFill>
  );
};

export const SafeStage: React.FC<{ children: ReactNode; align?: "center" | "start"; compact?: boolean }> = ({
  children,
  align = "center",
  compact = false,
}) => {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  return (
    <AbsoluteFill
      style={{
        padding: vertical ? "132px 72px" : compact ? "72px 96px" : "96px 128px",
        color: theme.cream,
        fontFamily: fontStack,
        justifyContent: align === "center" ? "center" : "flex-start",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const BrandMark: React.FC<{ branchName?: string }> = ({ branchName }) => (
  <div
    style={{
      position: "absolute",
      left: 72,
      bottom: 58,
      display: "flex",
      alignItems: "center",
      gap: 18,
      color: theme.cream,
      fontFamily: fontStack,
      fontSize: 22,
      fontWeight: 650,
      opacity: 0.86,
    }}
  >
    <div
      style={{
        width: 42,
        height: 42,
        border: `2px solid ${theme.gold}`,
        transform: "rotate(45deg)",
        boxShadow: "0 0 30px rgba(214,174,85,0.22)",
      }}
    />
    <div>
      <div style={{ color: theme.gold, letterSpacing: 0, textTransform: "uppercase" }}>Эхо Гор</div>
      {branchName ? <div style={{ color: theme.muted, fontSize: 17, marginTop: 3 }}>{branchName}</div> : null}
    </div>
  </div>
);

export const TitleBlock: React.FC<{ eyebrow?: string; title: string; subtitle?: string }> = ({
  eyebrow,
  title,
  subtitle,
}) => {
  const { width } = useVideoConfig();
  const vertical = width < 1300;
  return (
    <div style={{ maxWidth: vertical ? 900 : 1180 }}>
      {eyebrow ? (
        <FadeIn>
          <div
            style={{
              color: theme.gold,
              fontSize: vertical ? 28 : 32,
              fontWeight: 720,
              letterSpacing: 0,
              marginBottom: 22,
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
        </FadeIn>
      ) : null}
      <FadeIn delay={6}>
        <h1
          style={{
            margin: 0,
            fontSize: vertical ? 86 : 104,
            lineHeight: 0.94,
            letterSpacing: 0,
            fontWeight: 820,
            color: theme.cream,
            textWrap: "balance",
          }}
        >
          {title}
        </h1>
      </FadeIn>
      {subtitle ? (
        <FadeIn delay={14}>
          <p
            style={{
              maxWidth: vertical ? 820 : 960,
              margin: "34px 0 0",
              color: theme.muted,
              fontSize: vertical ? 34 : 38,
              lineHeight: 1.2,
              fontWeight: 520,
              textWrap: "balance",
            }}
          >
            {subtitle}
          </p>
        </FadeIn>
      ) : null}
    </div>
  );
};

export const MediaMosaic: React.FC<{ scene: VideoScene }> = ({ scene }) => {
  const media = scene.media?.filter((asset) => asset.type === "image") || [];
  const fallback = media.length === 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 26, height: "62%" }}>
      {[0, 1, 2].map((index) => {
        const asset = media[index];
        return (
          <FadeIn key={asset?.id || index} delay={index * 7} style={{ height: index === 0 ? "100%" : "auto" }}>
            <div
              style={{
                height: "100%",
                minHeight: index === 0 ? 420 : 230,
                overflow: "hidden",
                border: `1px solid rgba(214,174,85,${index === 0 ? 0.45 : 0.24})`,
                background:
                  index === 0
                    ? "linear-gradient(135deg, rgba(214,174,85,0.22), rgba(75,17,25,0.42))"
                    : "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(214,174,85,0.10))",
                boxShadow: index === 0 ? "0 30px 80px rgba(0,0,0,0.32)" : "none",
              }}
            >
              {asset?.url ? (
                <Img src={asset.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: fallback ? theme.gold : theme.muted,
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                >
                  {index === 0 ? "Сцена Эхо Гор" : "Кадр школы"}
                </div>
              )}
            </div>
          </FadeIn>
        );
      })}
    </div>
  );
};

export const MetricsGrid: React.FC<{ metrics: MetricItem[] }> = ({ metrics }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22, width: "100%" }}>
      {metrics.slice(0, 6).map((metric, index) => {
        const opacity = interpolate(frame, [index * 5, index * 5 + 18], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={`${metric.label}-${index}`}
            style={{
              minHeight: 190,
              padding: "28px 30px",
              border: "1px solid rgba(214,174,85,0.28)",
              background: "linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))",
              opacity,
            }}
          >
            <div style={{ color: theme.muted, fontSize: 24, fontWeight: 620, lineHeight: 1.15 }}>{metric.label}</div>
            <div style={{ color: theme.gold, fontSize: 58, fontWeight: 820, marginTop: 18, letterSpacing: 0 }}>
              {metric.value}
            </div>
            {metric.delta ? (
              <div style={{ color: theme.cream, fontSize: 22, fontWeight: 650, marginTop: 10 }}>{metric.delta}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export const OrnamentLine: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width: interpolate(frame, [0, 36], [0, 280], { extrapolateRight: "clamp" }),
        height: 3,
        background: `linear-gradient(90deg, ${theme.gold}, transparent)`,
        margin: "28px 0 34px",
      }}
    />
  );
};

export const SceneChrome: React.FC<{ children: ReactNode; branchName?: string }> = ({ children, branchName }) => (
  <AbsoluteFill>
    <StageBackdrop />
    <SafeStage>{children}</SafeStage>
    <BrandMark branchName={branchName} />
  </AbsoluteFill>
);

export const addOrganicOffset = (seed: string, amount: number) => {
  return (random(seed) - 0.5) * amount;
};
