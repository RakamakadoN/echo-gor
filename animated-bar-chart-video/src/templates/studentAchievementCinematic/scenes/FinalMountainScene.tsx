import { AbsoluteFill } from "remotion";
import {
  CinematicMountains,
  EchoGorLogo,
  FogLayer,
  KineticText,
  SafeVertical,
  SunRays,
} from "../components/CinematicElements";
import type { StudentAchievementPayload } from "../schema";

export const FinalMountainScene: React.FC<{ payload: StudentAchievementPayload }> = ({ payload }) => (
  <AbsoluteFill>
    <CinematicMountains variant="wide" dim={1.08} />
    <SunRays intensity={1.45} />
    <FogLayer opacity={0.46} top={780} speed={0.7} />
    <SafeVertical style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <EchoGorLogo logoUrl={payload.logoUrl} size={118} centered />
      <KineticText delay={14} size={82} style={{ marginTop: 82, maxWidth: 860 }}>
        Продолжай свой путь
      </KineticText>
      <KineticText delay={28} size={31} weight={650} color="#BBAF9D" style={{ marginTop: 28, maxWidth: 760 }}>
        {payload.studentName}, новые вершины уже ждут
      </KineticText>
    </SafeVertical>
  </AbsoluteFill>
);
