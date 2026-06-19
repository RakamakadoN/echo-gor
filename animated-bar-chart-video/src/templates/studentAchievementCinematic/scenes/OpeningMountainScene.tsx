import { AbsoluteFill } from "remotion";
import {
  CinematicMountains,
  EchoGorLogo,
  FogLayer,
  KineticText,
  MicroLabel,
  SafeVertical,
  SceneTransition,
  SunRays,
} from "../components/CinematicElements";
import type { StudentAchievementPayload } from "../schema";

export const OpeningMountainScene: React.FC<{ payload: StudentAchievementPayload }> = ({ payload }) => (
  <AbsoluteFill>
    <CinematicMountains />
    <SunRays intensity={0.9} />
    <FogLayer opacity={0.55} top={760} />
    <SafeVertical style={{ justifyContent: "space-between" }}>
      <EchoGorLogo logoUrl={payload.logoUrl} size={74} />
      <div style={{ paddingBottom: 210 }}>
        <MicroLabel>{payload.branchName}</MicroLabel>
        <KineticText delay={8} size={84} style={{ maxWidth: 880, marginTop: 26 }}>
          Новый шаг на пути артиста
        </KineticText>
      </div>
    </SafeVertical>
    <SceneTransition delay={76} />
  </AbsoluteFill>
);
