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
import type { StudentThanks, TeacherSpotlightGroup } from "../schema";

const fontStack =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const spotlight = {
  black: "#030303",
  ink: "#080B0E",
  graphite: "#141416",
  gold: "#D9B15F",
  goldLight: "#F4D78A",
  cream: "#F5ECDD",
  muted: "#ADA395",
  red: "#411017",
};

export const ease = (frame: number, input: [number, number], output: [number, number]) =>
  interpolate(frame, input, output, {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const PremiumStageBackdrop: React.FC<{ intensity?: number; children?: ReactNode }> = ({
  intensity = 1,
  children,
}) => {
  const frame = useCurrentFrame();
  const sweep = ease(frame % 150, [0, 150], [-160, 180]);

  return (
    <AbsoluteFill style={{ background: spotlight.black, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 14%, rgba(244,215,138,0.22), transparent 30%), linear-gradient(180deg, #11171a 0%, #060708 55%, #030303 100%)",
          filter: `brightness(${intensity})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 80 + sweep,
          top: -220,
          width: 170,
          height: 1320,
          background: "linear-gradient(180deg, rgba(244,215,138,0.42), rgba(244,215,138,0.08), transparent 82%)",
          filter: "blur(22px)",
          transform: "rotate(-14deg)",
          transformOrigin: "top center",
          mixBlendMode: "screen",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 120 - sweep * 0.45,
          top: -180,
          width: 130,
          height: 1160,
          background: "linear-gradient(180deg, rgba(255,255,255,0.20), rgba(217,177,95,0.08), transparent 78%)",
          filter: "blur(26px)",
          transform: "rotate(18deg)",
          mixBlendMode: "screen",
          opacity: 0.8,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 520,
          background:
            "linear-gradient(180deg, transparent, rgba(0,0,0,0.84)), radial-gradient(ellipse at center, rgba(217,177,95,0.12), transparent 62%)",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

export const SafeTrailerStage: React.FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill
    style={{
      padding: "118px 72px 104px",
      fontFamily: fontStack,
      color: spotlight.cream,
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);

export const TrailerTitle: React.FC<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  delay?: number;
  size?: number;
  align?: "left" | "center";
}> = ({ eyebrow, title, subtitle, delay = 0, size = 74, align = "left" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({
    frame: frame - delay,
    fps,
    config: { damping: 150, stiffness: 88, mass: 0.75 },
  });
  const opacity = interpolate(reveal, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(reveal, [0, 1], [38, 0], { extrapolateRight: "clamp" });

  return (
    <div style={{ textAlign: align, opacity, transform: `translateY(${y}px)` }}>
      {eyebrow ? (
        <div
          style={{
            color: spotlight.gold,
            fontSize: 24,
            fontWeight: 820,
            textTransform: "uppercase",
            letterSpacing: 0,
            marginBottom: 18,
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      <div
        style={{
          color: spotlight.cream,
          fontSize: size,
          fontWeight: 900,
          lineHeight: 0.94,
          letterSpacing: 0,
          textWrap: "balance",
          textShadow: "0 8px 46px rgba(0,0,0,0.62)",
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div
          style={{
            maxWidth: 820,
            color: spotlight.muted,
            fontSize: 29,
            lineHeight: 1.18,
            fontWeight: 650,
            marginTop: 24,
            textWrap: "balance",
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
};

export const TeacherPortrait: React.FC<{ name: string; photoUrl?: string; delay?: number }> = ({
  name,
  photoUrl,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({
    frame: frame - delay,
    fps,
    config: { damping: 170, stiffness: 74, mass: 0.85 },
  });
  const scale = interpolate(reveal, [0, 1], [0.94, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "relative",
        width: 650,
        height: 830,
        margin: "0 auto",
        opacity: interpolate(reveal, [0, 1], [0, 1], { extrapolateRight: "clamp" }),
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -22,
          border: "1px solid rgba(217,177,95,0.24)",
          boxShadow: "0 0 90px rgba(217,177,95,0.22)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          border: "1px solid rgba(217,177,95,0.45)",
          background: "linear-gradient(145deg, rgba(217,177,95,0.18), rgba(65,16,23,0.45))",
          boxShadow: "0 52px 150px rgba(0,0,0,0.55)",
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
              padding: 48,
              textAlign: "center",
              color: spotlight.goldLight,
              fontSize: 64,
              fontWeight: 900,
              background:
                "radial-gradient(circle at 50% 20%, rgba(244,215,138,0.24), transparent 34%), linear-gradient(160deg, #11181a, #300d13)",
            }}
          >
            {name}
          </div>
        )}
      </div>
    </div>
  );
};

export const StatCounter: React.FC<{ label: string; value: number | string; delay?: number }> = ({
  label,
  value,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const numeric = typeof value === "number";
  const progress = ease(frame, [delay, delay + 34], [0, 1]);
  const shown = numeric ? Math.round(value * progress) : value;

  return (
    <div
      style={{
        minHeight: 218,
        padding: "30px 28px",
        border: "1px solid rgba(217,177,95,0.34)",
        background: "linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.025))",
        opacity: ease(frame, [delay, delay + 16], [0, 1]),
        transform: `translateY(${ease(frame, [delay, delay + 22], [32, 0])}px)`,
      }}
    >
      <div style={{ color: spotlight.goldLight, fontSize: 70, fontWeight: 950 }}>{shown}</div>
      <div style={{ color: spotlight.muted, fontSize: 23, fontWeight: 720, marginTop: 8 }}>{label}</div>
    </div>
  );
};

export const GroupBadgeWall: React.FC<{ groups: TeacherSpotlightGroup[]; delay?: number }> = ({ groups, delay = 0 }) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {groups.slice(0, 4).map((group, index) => (
        <div
          key={group.id}
          style={{
            padding: "26px 28px",
            border: "1px solid rgba(217,177,95,0.30)",
            background: "linear-gradient(145deg, rgba(217,177,95,0.12), rgba(255,255,255,0.035))",
            opacity: ease(frame, [delay + index * 10, delay + index * 10 + 16], [0, 1]),
            transform: `translateX(${ease(frame, [delay + index * 10, delay + index * 10 + 24], [60, 0])}px)`,
          }}
        >
          <div style={{ color: spotlight.cream, fontSize: 34, fontWeight: 900 }}>{group.name}</div>
          <div style={{ color: spotlight.muted, fontSize: 22, fontWeight: 650, marginTop: 8 }}>
            {group.level} / {group.studentCount} учеников
          </div>
        </div>
      ))}
    </div>
  );
};

export const AchievementWall: React.FC<{ achievements: string[]; delay?: number }> = ({ achievements, delay = 0 }) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
      {achievements.slice(0, 4).map((achievement, index) => (
        <div
          key={`${achievement}-${index}`}
          style={{
            minHeight: 136,
            padding: "24px 26px",
            border: "1px solid rgba(217,177,95,0.28)",
            background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(65,16,23,0.20))",
            color: spotlight.cream,
            fontSize: 28,
            fontWeight: 820,
            lineHeight: 1.08,
            opacity: ease(frame, [delay + index * 9, delay + index * 9 + 16], [0, 1]),
          }}
        >
          {achievement}
        </div>
      ))}
    </div>
  );
};

export const GratitudeQuote: React.FC<{ thanks: StudentThanks[]; delay?: number }> = ({ thanks, delay = 0 }) => {
  const item = thanks[0] || { text: "Спасибо за уверенность и сцену.", studentName: "Ученики" };
  const frame = useCurrentFrame();
  const opacity = ease(frame, [delay, delay + 24], [0, 1]);

  return (
    <div
      style={{
        opacity,
        paddingLeft: 34,
        borderLeft: `4px solid ${spotlight.gold}`,
      }}
    >
      <div
        style={{
          color: spotlight.cream,
          fontSize: 55,
          lineHeight: 1.06,
          fontWeight: 820,
          textWrap: "balance",
        }}
      >
        «{item.text}»
      </div>
      <div style={{ color: spotlight.muted, fontSize: 28, fontWeight: 700, marginTop: 30 }}>
        {item.studentName || "Ученики"}
      </div>
    </div>
  );
};

export const TrailerLogo: React.FC<{ logoUrl?: string; centered?: boolean }> = ({ logoUrl, centered = false }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: centered ? "center" : "flex-start",
      gap: 18,
    }}
  >
    <div
      style={{
        width: 76,
        height: 76,
        border: logoUrl ? "none" : `2px solid ${spotlight.gold}`,
        transform: logoUrl ? "none" : "rotate(45deg)",
        boxShadow: "0 0 48px rgba(217,177,95,0.32)",
      }}
    >
      {logoUrl ? <Img src={logoUrl} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : null}
    </div>
    <div>
      <div style={{ color: spotlight.gold, fontSize: 34, fontWeight: 900 }}>Эхо Гор</div>
      <div style={{ color: spotlight.muted, fontSize: 19, fontWeight: 700, marginTop: 4 }}>teacher spotlight</div>
    </div>
  </div>
);
