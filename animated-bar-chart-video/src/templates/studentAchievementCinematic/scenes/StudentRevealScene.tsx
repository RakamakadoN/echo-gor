import { AbsoluteFill } from "remotion";
import {
  CinematicMountains,
  FogLayer,
  KineticText,
  MicroLabel,
  SafeVertical,
  SceneTransition,
  StudentPortrait,
  SunRays,
} from "../components/CinematicElements";
import type { StudentAchievementPayload } from "../schema";

export const StudentRevealScene: React.FC<{ payload: StudentAchievementPayload }> = ({ payload }) => (
  <AbsoluteFill>
    <CinematicMountains variant="close" dim={0.82} />
    <SunRays intensity={0.65} />
    <SafeVertical style={{ justifyContent: "center" }}>
      <StudentPortrait name={payload.studentName} photoUrl={payload.photoUrl} />
      <div style={{ marginTop: 54 }}>
        <MicroLabel>
          {payload.branchName} / {payload.groupName}
        </MicroLabel>
        <KineticText delay={16} size={82} style={{ marginTop: 18 }}>
          {payload.studentName}
        </KineticText>
        <KineticText delay={25} size={34} weight={650} color="#BBAF9D" style={{ marginTop: 18 }}>
          Уровень: {payload.level} / Наставник: {payload.teacherName}
        </KineticText>
      </div>
    </SafeVertical>
    <FogLayer opacity={0.46} top={690} speed={1.35} />
    <SceneTransition delay={84} color="rgba(247,216,137,0.42)" />
  </AbsoluteFill>
);
