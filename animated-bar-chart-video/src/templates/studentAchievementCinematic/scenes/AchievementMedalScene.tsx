import { AbsoluteFill } from "remotion";
import {
  CinematicMountains,
  FogLayer,
  GoldMedal,
  KineticText,
  MicroLabel,
  SafeVertical,
  SceneTransition,
  SunRays,
} from "../components/CinematicElements";
import type { StudentAchievementPayload } from "../schema";

export const AchievementMedalScene: React.FC<{ payload: StudentAchievementPayload }> = ({ payload }) => (
  <AbsoluteFill>
    <CinematicMountains variant="close" dim={0.76} />
    <SunRays intensity={1.15} />
    <SafeVertical style={{ justifyContent: "center", textAlign: "center" }}>
      <GoldMedal label="достижение открыто" />
      <div style={{ marginTop: 140 }}>
        <MicroLabel style={{ textAlign: "center" }}>{payload.receivedAt}</MicroLabel>
        <KineticText delay={18} size={78} style={{ marginTop: 22 }}>
          {payload.achievement}
        </KineticText>
        <KineticText delay={30} size={32} weight={650} color="#BBAF9D" style={{ marginTop: 18 }}>
          {payload.studentName} делает уверенный шаг к большой сцене
        </KineticText>
      </div>
    </SafeVertical>
    <FogLayer opacity={0.34} top={980} speed={0.8} />
    <SceneTransition delay={94} />
  </AbsoluteFill>
);
