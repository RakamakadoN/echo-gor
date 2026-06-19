import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../../../components/EchoGorVisuals";

const fontStack =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const cinematic = {
  gold: "#D9B15F",
  goldLight: "#F7D889",
  ink: "#050505",
  blueBlack: "#071015",
  fog: "rgba(236,233,221,0.22)",
  cream: "#F6EBDD",
  muted: "#BBAF9D",
  burgundy: "#3B0D14",
};

export const frameRange = (frame: number, input: [number, number], output: [number, number]) =>
  interpolate(frame, input, output, {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const CinematicMountains: React.FC<{ variant?: "wide" | "close"; dim?: number }> = ({
  variant = "wide",
  dim = 1,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const push = frameRange(frame, [0, 540], [1, variant === "close" ? 1.11 : 1.07]);
  const lower = `polygon(0 ${height}px, 0 ${height * 0.7}px, ${width * 0.13}px ${height * 0.58}px, ${width * 0.28}px ${height * 0.69}px, ${width * 0.45}px ${height * 0.52}px, ${width * 0.62}px ${height * 0.68}px, ${width * 0.78}px ${height * 0.57}px, ${width}px ${height * 0.71}px, ${width}px ${height}px)`;
  const upper = `polygon(0 ${height}px, 0 ${height * 0.64}px, ${width * 0.18}px ${height * 0.54}px, ${width * 0.34}px ${height * 0.62}px, ${width * 0.52}px ${height * 0.43}px, ${width * 0.68}px ${height * 0.61}px, ${width * 0.86}px ${height * 0.48}px, ${width}px ${height * 0.59}px, ${width}px ${height}px)`;

  return (
    <AbsoluteFill style={{ background: cinematic.ink, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 53% 17%, rgba(247,216,137,0.26), transparent 31%), linear-gradient(180deg, #10181f 0%, #07090b 48%, #050505 100%)",
          transform: `scale(${push})`,
          filter: `brightness(${dim})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -80,
          right: -80,
          bottom: 210,
          height: height * 0.48,
          clipPath: upper,
          background: "linear-gradient(180deg, rgba(217,177,95,0.26), rgba(7,12,15,0.82))",
          opacity: 0.72,
          transform: `scale(${push * 1.015}) translateY(${frameRange(frame, [0, 540], [12, -10])}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -100,
          right: -100,
          bottom: 0,
          height: height * 0.46,
          clipPath: lower,
          background: "linear-gradient(180deg, rgba(217,177,95,0.20), rgba(0,0,0,0.94))",
          opacity: 0.92,
          transform: `scale(${push * 1.03})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.10), transparent 36%, rgba(0,0,0,0.72))",
        }}
      />
    </AbsoluteFill>
  );
};

export const SunRays: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const frame = useCurrentFrame();
  const sweep = frameRange(frame % 180, [0, 180], [-180, 180]);

  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.7 * intensity }}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            top: -160,
            left: 350 + index * 95,
            width: 130,
            height: 1260,
            background: "linear-gradient(180deg, rgba(247,216,137,0.34), transparent 78%)",
            filter: "blur(18px)",
            transform: `translateX(${sweep + index * 20}px) rotate(${16 + index * 8}deg)`,
            transformOrigin: "top center",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

export const FogLayer: React.FC<{ opacity?: number; speed?: number; top?: number }> = ({
  opacity = 0.42,
  speed = 1,
  top = 760,
}) => {
  const frame = useCurrentFrame();
  const x = frameRange((frame * speed) % 220, [0, 220], [-160, 120]);

  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            top: top + index * 115,
            left: -260 + index * 180,
            width: 820,
            height: 220,
            borderRadius: 999,
            background: cinematic.fog,
            filter: "blur(60px)",
            transform: `translateX(${x + index * 80}px)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

export const SceneTransition: React.FC<{ delay?: number; color?: string }> = ({
  delay = 0,
  color = "rgba(247,216,137,0.34)",
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 10, delay + 28], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        background: `linear-gradient(105deg, transparent, ${color}, transparent)`,
        filter: "blur(14px)",
        transform: `translateX(${frameRange(frame - delay, [0, 28], [-420, 420])}px) skewX(-18deg)`,
      }}
    />
  );
};

export const SafeVertical: React.FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill
    style={{
      padding: "132px 74px 110px",
      color: cinematic.cream,
      fontFamily: fontStack,
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);

export const EchoGorLogo: React.FC<{ logoUrl?: string; size?: number; centered?: boolean }> = ({
  logoUrl,
  size = 108,
  centered = false,
}) => {
  const frame = useCurrentFrame();
  const glow = frameRange(frame % 120, [0, 60], [0.18, 0.44]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: centered ? "center" : "flex-start",
        gap: 20,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          border: logoUrl ? "none" : `3px solid ${cinematic.gold}`,
          boxShadow: `0 0 ${44 + glow * 60}px rgba(217,177,95,${glow})`,
          transform: logoUrl ? "none" : "rotate(45deg)",
          overflow: "hidden",
        }}
      >
        {logoUrl ? <Img src={logoUrl} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : null}
      </div>
      <div style={{ textAlign: centered ? "center" : "left" }}>
        <div style={{ color: cinematic.gold, fontSize: centered ? 48 : 34, fontWeight: 840 }}>Эхо Гор</div>
        <div style={{ color: cinematic.muted, fontSize: centered ? 24 : 20, fontWeight: 620, marginTop: 4 }}>
          школа кавказского танца
        </div>
      </div>
    </div>
  );
};

export const KineticText: React.FC<{
  children: ReactNode;
  delay?: number;
  size?: number;
  weight?: number;
  color?: string;
  style?: CSSProperties;
}> = ({ children, delay = 0, size = 72, weight = 820, color = cinematic.cream, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 160, stiffness: 82, mass: 0.75 },
  });

  return (
    <div
      style={{
        opacity: interpolate(entrance, [0, 1], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${interpolate(entrance, [0, 1], [34, 0], {
          extrapolateRight: "clamp",
        })}px)`,
        color,
        fontSize: size,
        lineHeight: 1.02,
        fontWeight: weight,
        letterSpacing: 0,
        textWrap: "balance",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const StudentPortrait: React.FC<{ name: string; photoUrl?: string }> = ({ name, photoUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({
    frame: frame - 8,
    fps,
    config: { damping: 170, stiffness: 70, mass: 0.9 },
  });
  const scale = interpolate(entrance, [0, 1], [0.92, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "relative",
        width: 670,
        height: 780,
        margin: "0 auto",
        transform: `scale(${scale})`,
        opacity: interpolate(entrance, [0, 1], [0, 1], { extrapolateRight: "clamp" }),
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "1px solid rgba(217,177,95,0.48)",
          background: "linear-gradient(145deg, rgba(217,177,95,0.18), rgba(59,13,20,0.48))",
          boxShadow: "0 48px 140px rgba(0,0,0,0.48), 0 0 80px rgba(217,177,95,0.20)",
          overflow: "hidden",
        }}
      >
        {photoUrl ? (
          <Img src={photoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 54,
              textAlign: "center",
              color: cinematic.gold,
              fontSize: 72,
              fontWeight: 860,
              background:
                "radial-gradient(circle at 50% 22%, rgba(247,216,137,0.28), transparent 35%), linear-gradient(160deg, rgba(15,25,28,0.96), rgba(59,13,20,0.82))",
            }}
          >
            {name}
          </div>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          inset: -18,
          border: "1px solid rgba(247,216,137,0.20)",
          filter: "drop-shadow(0 0 42px rgba(217,177,95,0.22))",
        }}
      />
    </div>
  );
};

export const GoldMedal: React.FC<{ label: string }> = ({ label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({
    frame: frame - 4,
    fps,
    config: { damping: 130, stiffness: 92, mass: 0.7 },
  });
  const pulse = frameRange(frame % 90, [0, 45], [0.88, 1.08]);

  return (
    <div
      style={{
        position: "relative",
        width: 430,
        height: 430,
        margin: "0 auto",
        transform: `scale(${interpolate(pop, [0, 1], [0.72, 1], { extrapolateRight: "clamp" })}) rotate(${interpolate(pop, [0, 1], [-8, 0], { extrapolateRight: "clamp" })}deg)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -70,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(247,216,137,0.28), transparent 63%)",
          transform: `scale(${pulse})`,
          filter: "blur(12px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 36% 28%, #fff1b6 0%, #f4cf76 24%, #b98733 58%, #6f4616 100%)",
          boxShadow: "0 30px 120px rgba(217,177,95,0.42), inset 0 0 40px rgba(255,255,255,0.24)",
          border: "6px solid rgba(255,233,169,0.72)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 46,
          borderRadius: "50%",
          border: "2px solid rgba(80,48,14,0.42)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#51330F",
          fontSize: 132,
          fontWeight: 900,
        }}
      >
        ★
      </div>
      <div
        style={{
          position: "absolute",
          left: -120,
          right: -120,
          bottom: -108,
          textAlign: "center",
          color: cinematic.goldLight,
          fontSize: 34,
          fontWeight: 780,
          textShadow: "0 0 34px rgba(217,177,95,0.36)",
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const ProgressCounter: React.FC<{
  label: string;
  value: number;
  suffix?: string;
  delay?: number;
}> = ({ label, value, suffix = "", delay = 0 }) => {
  const frame = useCurrentFrame();
  const progress = frameRange(frame, [delay, delay + 42], [0, 1]);
  const shown = Math.round(value * progress);

  return (
    <div
      style={{
        minHeight: 238,
        padding: "32px 30px",
        border: "1px solid rgba(217,177,95,0.34)",
        background: "linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.025))",
        boxShadow: "0 22px 80px rgba(0,0,0,0.28)",
        opacity: frameRange(frame, [delay, delay + 18], [0, 1]),
        transform: `translateY(${frameRange(frame, [delay, delay + 24], [34, 0])}px)`,
      }}
    >
      <div style={{ color: cinematic.muted, fontSize: 27, fontWeight: 690, lineHeight: 1.16 }}>{label}</div>
      <div style={{ color: cinematic.goldLight, fontSize: 74, fontWeight: 900, marginTop: 18 }}>
        {shown}
        {suffix}
      </div>
    </div>
  );
};

export const MicroLabel: React.FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      color: theme.gold,
      fontSize: 25,
      fontWeight: 760,
      textTransform: "uppercase",
      letterSpacing: 0,
      ...style,
    }}
  >
    {children}
  </div>
);
