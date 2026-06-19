import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { JourneyMoment } from "../schema";

const fontStack =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const documentary = {
  black: "#030405",
  ink: "#071014",
  charcoal: "#121416",
  gold: "#D8B466",
  goldLight: "#F2D891",
  cream: "#F4EBDD",
  muted: "#AFA79A",
  red: "#3A0E13",
};

export const easeFrame = (frame: number, input: [number, number], output: [number, number]) =>
  interpolate(frame, input, output, {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const SafeDocStage: React.FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill
    style={{
      padding: "118px 72px 104px",
      fontFamily: fontStack,
      color: documentary.cream,
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);

export const CaucasusMountains: React.FC<{ intensity?: number; low?: boolean }> = ({
  intensity = 1,
  low = false,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const push = easeFrame(frame, [0, 1800], [1, 1.08]);
  const ridgeA = `polygon(0 ${height}px, 0 ${height * 0.64}px, ${width * 0.13}px ${height * 0.55}px, ${width * 0.31}px ${height * 0.66}px, ${width * 0.47}px ${height * 0.46}px, ${width * 0.62}px ${height * 0.63}px, ${width * 0.78}px ${height * 0.51}px, ${width}px ${height * 0.65}px, ${width}px ${height}px)`;
  const ridgeB = `polygon(0 ${height}px, 0 ${height * 0.72}px, ${width * 0.18}px ${height * 0.58}px, ${width * 0.34}px ${height * 0.73}px, ${width * 0.52}px ${height * 0.56}px, ${width * 0.7}px ${height * 0.71}px, ${width * 0.88}px ${height * 0.6}px, ${width}px ${height * 0.7}px, ${width}px ${height}px)`;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 54% 18%, rgba(242,216,145,0.22), transparent 30%), linear-gradient(180deg, #0e171c 0%, #050607 58%, #030405 100%)",
          transform: `scale(${push})`,
          filter: `brightness(${intensity})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -90,
          right: -90,
          bottom: low ? -80 : 130,
          height: height * 0.52,
          clipPath: ridgeA,
          background: "linear-gradient(180deg, rgba(216,180,102,0.22), rgba(6,9,10,0.88))",
          opacity: 0.72,
          transform: `translateY(${easeFrame(frame, [0, 1800], [18, -8])}px) scale(${push * 1.015})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -110,
          right: -110,
          bottom: -30,
          height: height * 0.46,
          clipPath: ridgeB,
          background: "linear-gradient(180deg, rgba(216,180,102,0.17), rgba(0,0,0,0.96))",
          opacity: 0.94,
          transform: `scale(${push * 1.03})`,
        }}
      />
    </AbsoluteFill>
  );
};

export const FogBand: React.FC<{ top?: number; opacity?: number; speed?: number }> = ({
  top = 740,
  opacity = 0.42,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const move = easeFrame((frame * speed) % 240, [0, 240], [-170, 150]);

  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            top: top + index * 130,
            left: -280 + index * 210,
            width: 820,
            height: 210,
            borderRadius: 999,
            background: "rgba(238,232,218,0.20)",
            filter: "blur(64px)",
            transform: `translateX(${move + index * 90}px)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

export const StageLight: React.FC<{ intensity?: number; side?: "left" | "right" | "center" }> = ({
  intensity = 1,
  side = "center",
}) => {
  const frame = useCurrentFrame();
  const drift = easeFrame(frame % 180, [0, 180], [-26, 26]);
  const left = side === "left" ? 125 : side === "right" ? 610 : 370;

  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.72 * intensity }}>
      <div
        style={{
          position: "absolute",
          top: -180,
          left,
          width: 170,
          height: 1340,
          background: "linear-gradient(180deg, rgba(242,216,145,0.42), rgba(242,216,145,0.08), transparent 82%)",
          filter: "blur(20px)",
          transform: `translateX(${drift}px) rotate(${side === "left" ? -18 : side === "right" ? 18 : 0}deg)`,
          transformOrigin: "top center",
        }}
      />
    </AbsoluteFill>
  );
};

export const FilmGrain: React.FC<{ opacity?: number }> = ({ opacity = 0.18 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        opacity,
        mixBlendMode: "overlay",
        backgroundImage: Array.from({ length: 18 })
          .map((_, index) => {
            const x = Math.round(random(`grain-x-${index}-${frame % 6}`) * 100);
            const y = Math.round(random(`grain-y-${index}-${frame % 6}`) * 100);
            return `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.22) 0 1px, transparent 1px)`;
          })
          .join(","),
        backgroundSize: "120px 120px",
      }}
    />
  );
};

export const DocumentaryBackdrop: React.FC<{
  children: ReactNode;
  mountainIntensity?: number;
  lightSide?: "left" | "right" | "center";
  fogTop?: number;
}> = ({ children, mountainIntensity = 1, lightSide = "center", fogTop = 760 }) => (
  <AbsoluteFill style={{ background: documentary.black, overflow: "hidden" }}>
    <CaucasusMountains intensity={mountainIntensity} />
    <StageLight side={lightSide} />
    <FogBand top={fogTop} />
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, rgba(0,0,0,0.10), transparent 38%, rgba(0,0,0,0.72))",
      }}
    />
    {children}
    <FilmGrain />
  </AbsoluteFill>
);

export const ChapterTitle: React.FC<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  delay?: number;
  align?: "left" | "center";
  size?: number;
}> = ({ eyebrow, title, subtitle, delay = 0, align = "left", size = 76 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({
    frame: frame - delay,
    fps,
    config: { damping: 170, stiffness: 78, mass: 0.8 },
  });
  const opacity = interpolate(reveal, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(reveal, [0, 1], [34, 0], { extrapolateRight: "clamp" });

  return (
    <div style={{ textAlign: align, opacity, transform: `translateY(${y}px)` }}>
      {eyebrow ? (
        <div
          style={{
            color: documentary.gold,
            fontSize: 24,
            fontWeight: 780,
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
          color: documentary.cream,
          fontSize: size,
          lineHeight: 0.98,
          fontWeight: 860,
          letterSpacing: 0,
          textWrap: "balance",
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div
          style={{
            color: documentary.muted,
            fontSize: 30,
            lineHeight: 1.18,
            fontWeight: 610,
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

export const MediaMoment: React.FC<{
  moment: JourneyMoment;
  height?: number;
  delay?: number;
  large?: boolean;
}> = ({ moment, height = 420, delay = 0, large = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 160, stiffness: 80, mass: 0.8 },
  });
  const scale = interpolate(entrance, [0, 1], [0.96, 1], { extrapolateRight: "clamp" });
  const opacity = interpolate(entrance, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const zoom = easeFrame(frame - delay, [0, 180], [1, 1.045]);

  return (
    <div
      style={{
        height,
        overflow: "hidden",
        border: "1px solid rgba(216,180,102,0.32)",
        background: "linear-gradient(145deg, rgba(216,180,102,0.16), rgba(58,14,19,0.34))",
        boxShadow: large ? "0 38px 120px rgba(0,0,0,0.46)" : "0 24px 80px rgba(0,0,0,0.28)",
        opacity,
        transform: `scale(${scale})`,
        position: "relative",
      }}
    >
      {moment.mediaUrl && moment.mediaType === "video" ? (
        <OffthreadVideo src={moment.mediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
      ) : moment.mediaUrl ? (
        <Img src={moment.mediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
      ) : (
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: 34,
            background:
              "radial-gradient(circle at 40% 22%, rgba(242,216,145,0.20), transparent 36%), linear-gradient(145deg, #11181c, #290b10)",
          }}
        >
          <div style={{ color: documentary.gold, fontSize: large ? 42 : 30, fontWeight: 840 }}>{moment.title}</div>
          <div style={{ color: documentary.muted, fontSize: 22, fontWeight: 650, marginTop: 10 }}>{moment.date}</div>
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: 18,
          bottom: 18,
          right: 18,
          color: documentary.cream,
          fontSize: 20,
          fontWeight: 720,
          textShadow: "0 2px 16px rgba(0,0,0,0.88)",
        }}
      >
        {moment.mediaUrl ? moment.title : null}
      </div>
    </div>
  );
};

export const ArchivePhoto: React.FC<{ moment: JourneyMoment; photoUrl?: string; delay?: number }> = ({
  moment,
  photoUrl,
  delay = 0,
}) => {
  const archiveMoment = photoUrl ? { ...moment, mediaUrl: photoUrl, mediaType: "image" as const } : moment;

  return (
    <div
      style={{
        padding: 18,
        background: "#EEE5D4",
        boxShadow: "0 36px 110px rgba(0,0,0,0.48)",
        transform: "rotate(-2deg)",
      }}
    >
      <MediaMoment moment={archiveMoment} height={720} delay={delay} large />
      <div style={{ color: "#30251A", fontSize: 24, fontWeight: 760, marginTop: 18 }}>{moment.date}</div>
    </div>
  );
};

export const TimelineRail: React.FC<{ moments: JourneyMoment[]; delay?: number }> = ({ moments, delay = 0 }) => {
  const frame = useCurrentFrame();
  const draw = easeFrame(frame, [delay, delay + 70], [0, 1]);

  return (
    <div style={{ position: "relative", paddingLeft: 38 }}>
      <div
        style={{
          position: "absolute",
          left: 10,
          top: 8,
          width: 3,
          height: `${draw * 100}%`,
          background: `linear-gradient(180deg, ${documentary.goldLight}, transparent)`,
        }}
      />
      {moments.slice(0, 5).map((moment, index) => {
        const opacity = easeFrame(frame, [delay + index * 12, delay + index * 12 + 20], [0, 1]);
        return (
          <div key={moment.id} style={{ position: "relative", marginBottom: 34, opacity }}>
            <div
              style={{
                position: "absolute",
                left: -36,
                top: 8,
                width: 19,
                height: 19,
                borderRadius: "50%",
                background: documentary.gold,
                boxShadow: "0 0 28px rgba(216,180,102,0.48)",
              }}
            />
            <div style={{ color: documentary.gold, fontSize: 23, fontWeight: 780 }}>{moment.date}</div>
            <div style={{ color: documentary.cream, fontSize: 34, fontWeight: 830, marginTop: 6 }}>
              {moment.title}
            </div>
            {moment.location ? (
              <div style={{ color: documentary.muted, fontSize: 22, fontWeight: 620, marginTop: 6 }}>
                {moment.location}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export const DiplomaWall: React.FC<{ moments: JourneyMoment[]; delay?: number }> = ({ moments, delay = 0 }) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
      {moments.slice(0, 4).map((moment, index) => (
        <div
          key={moment.id}
          style={{
            minHeight: 250,
            padding: 28,
            border: "1px solid rgba(216,180,102,0.36)",
            background: "linear-gradient(145deg, rgba(255,255,255,0.085), rgba(255,255,255,0.025))",
            opacity: easeFrame(frame, [delay + index * 10, delay + index * 10 + 18], [0, 1]),
            transform: `translateY(${easeFrame(frame, [delay + index * 10, delay + index * 10 + 24], [28, 0])}px)`,
          }}
        >
          <div style={{ color: documentary.goldLight, fontSize: 22, fontWeight: 780 }}>{moment.date}</div>
          <div style={{ color: documentary.cream, fontSize: 30, fontWeight: 830, lineHeight: 1.05, marginTop: 14 }}>
            {moment.title}
          </div>
          {moment.description ? (
            <div style={{ color: documentary.muted, fontSize: 19, lineHeight: 1.18, fontWeight: 600, marginTop: 14 }}>
              {moment.description}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export const DocumentaryLogo: React.FC<{ logoUrl?: string; centered?: boolean }> = ({ logoUrl, centered = false }) => (
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
        border: logoUrl ? "none" : `2px solid ${documentary.gold}`,
        transform: logoUrl ? "none" : "rotate(45deg)",
        boxShadow: "0 0 48px rgba(216,180,102,0.28)",
      }}
    >
      {logoUrl ? <Img src={logoUrl} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : null}
    </div>
    <div>
      <div style={{ color: documentary.gold, fontSize: 34, fontWeight: 850 }}>Эхо Гор</div>
      <div style={{ color: documentary.muted, fontSize: 19, fontWeight: 650, marginTop: 4 }}>documentary archive</div>
    </div>
  </div>
);

export const StatLine: React.FC<{ label: string; value: string | number; delay?: number }> = ({
  label,
  value,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ opacity: easeFrame(frame, [delay, delay + 18], [0, 1]) }}>
      <div style={{ color: documentary.goldLight, fontSize: 56, fontWeight: 900 }}>{value}</div>
      <div style={{ color: documentary.muted, fontSize: 23, fontWeight: 670, marginTop: 4 }}>{label}</div>
    </div>
  );
};
