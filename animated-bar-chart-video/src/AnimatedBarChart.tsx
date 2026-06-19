import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { chartData, getBarHeightRatio } from "./chartData";

const chartHeight = 560;
const barWidth = 150;
const chartTop = 270;
const staggerDelay = 5;

const scene: CSSProperties = {
  background: "linear-gradient(135deg, #f7f8fb 0%, #eef3f8 100%)",
  color: "#162033",
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  padding: "92px 140px",
};

const titleStyle: CSSProperties = {
  fontSize: 72,
  fontWeight: 780,
  letterSpacing: 0,
  margin: 0,
};

const eyebrowStyle: CSSProperties = {
  color: "#5b667a",
  fontSize: 28,
  fontWeight: 650,
  letterSpacing: 0,
  marginBottom: 18,
};

const chartWrap: CSSProperties = {
  position: "absolute",
  left: 170,
  right: 170,
  top: chartTop,
  height: chartHeight + 95,
};

const baseline: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  top: chartHeight,
  height: 4,
  background: "#263246",
  borderRadius: 4,
};

const gridLine = (index: number): CSSProperties => ({
  position: "absolute",
  left: 0,
  right: 0,
  top: (chartHeight / 4) * index,
  height: 2,
  background: "rgba(76, 88, 110, 0.14)",
});

const valueStyle = (opacity: number, barHeight: number): CSSProperties => ({
  position: "absolute",
  top: chartHeight - barHeight - 58,
  left: "50%",
  transform: "translateX(-50%)",
  fontSize: 34,
  fontWeight: 780,
  color: "#162033",
  opacity,
});

const labelStyle = (opacity: number): CSSProperties => ({
  position: "absolute",
  top: chartHeight + 30,
  left: "50%",
  transform: "translateX(-50%)",
  width: 190,
  textAlign: "center",
  fontSize: 28,
  fontWeight: 700,
  color: "#4d5a6f",
  opacity,
});

export const AnimatedBarChart = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 0.7 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={scene}>
      <div style={{ opacity: titleOpacity }}>
        <div style={eyebrowStyle}>Quarterly momentum</div>
        <h1 style={titleStyle}>Animated 5-Bar Chart</h1>
      </div>

      <div style={chartWrap}>
        {[0, 1, 2, 3].map((line) => (
          <div key={line} style={gridLine(line)} />
        ))}
        <div style={baseline} />

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: chartHeight,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: "0 36px",
          }}
        >
          {chartData.map((item, index) => {
            const growth = spring({
              frame,
              fps,
              delay: index * staggerDelay + 12,
              config: {
                damping: 160,
                stiffness: 95,
                mass: 0.9,
              },
            });

            const clampedGrowth = Math.min(growth, 1);
            const barHeight = getBarHeightRatio(item.value) * chartHeight * clampedGrowth;
            const textOpacity = interpolate(
              frame,
              [index * staggerDelay + 30, index * staggerDelay + 55],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              },
            );

            return (
              <div
                key={item.label}
                style={{
                  position: "relative",
                  width: barWidth,
                  height: chartHeight,
                }}
              >
                <div style={valueStyle(textOpacity, Math.max(8, barHeight))}>{item.value}</div>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: Math.max(8, barHeight),
                    borderRadius: "14px 14px 0 0",
                    background: `linear-gradient(180deg, ${item.color} 0%, ${item.color}dd 100%)`,
                    boxShadow:
                      item.value === 100
                        ? "0 26px 48px rgba(123, 97, 255, 0.28)"
                        : "0 20px 36px rgba(36, 47, 70, 0.16)",
                  }}
                />
                <div style={labelStyle(textOpacity)}>{item.label}</div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: "absolute",
            left: -24,
            top: chartHeight - 22,
            color: "#6b7485",
            fontSize: 24,
            fontWeight: 650,
            transform: "translateX(-100%)",
          }}
        >
          0
        </div>
        <div
          style={{
            position: "absolute",
            left: -24,
            top: -22,
            color: "#6b7485",
            fontSize: 24,
            fontWeight: 650,
            transform: "translateX(-100%)",
          }}
        >
          100
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: 140,
          bottom: 86,
          color: "#687386",
          fontSize: 26,
          fontWeight: 650,
          opacity: interpolate(frame, [4.1 * fps, 5 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Frame-driven Remotion animation
      </div>
    </AbsoluteFill>
  );
};
