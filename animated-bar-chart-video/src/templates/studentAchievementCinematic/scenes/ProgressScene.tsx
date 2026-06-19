import { AbsoluteFill } from "remotion";
import {
  CinematicMountains,
  FogLayer,
  KineticText,
  MicroLabel,
  ProgressCounter,
  SafeVertical,
  SceneTransition,
  SunRays,
} from "../components/CinematicElements";
import type { StudentAchievementPayload } from "../schema";

export const ProgressScene: React.FC<{ payload: StudentAchievementPayload }> = ({ payload }) => (
  <AbsoluteFill>
    <CinematicMountains dim={0.68} />
    <SunRays intensity={0.72} />
    <SafeVertical style={{ justifyContent: "center" }}>
      <MicroLabel>Прогресс ученика</MicroLabel>
      <KineticText delay={6} size={70} style={{ maxWidth: 860, marginTop: 20, marginBottom: 58 }}>
        Дисциплина, сцена и новые вершины
      </KineticText>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
        <ProgressCounter label="Посещений" value={payload.attendanceCount} delay={18} />
        <ProgressCounter label="Концертов" value={payload.performanceCount} delay={32} />
        <ProgressCounter label="Открытых достижений" value={payload.unlockedAchievements} delay={46} />
      </div>
    </SafeVertical>
    <FogLayer opacity={0.36} top={1080} speed={1.1} />
    <SceneTransition delay={88} color="rgba(255,255,255,0.22)" />
  </AbsoluteFill>
);
