import { AbsoluteFill, Series } from "remotion";
import { theme } from "../../components/EchoGorVisuals";
import { defaultStudentAchievementPayload } from "./defaultPayload";
import { AchievementMedalScene } from "./scenes/AchievementMedalScene";
import { FinalMountainScene } from "./scenes/FinalMountainScene";
import { OpeningMountainScene } from "./scenes/OpeningMountainScene";
import { ProgressScene } from "./scenes/ProgressScene";
import { StudentRevealScene } from "./scenes/StudentRevealScene";
import type { StudentAchievementPayload } from "./schema";

export type StudentAchievementCinematicVideoProps = {
  payload?: StudentAchievementPayload;
};

const sceneDurations = {
  opening: 96,
  student: 108,
  achievement: 120,
  progress: 114,
  final: 102,
};

export const StudentAchievementCinematicVideo: React.FC<StudentAchievementCinematicVideoProps> = ({
  payload = defaultStudentAchievementPayload,
}) => (
  <AbsoluteFill style={{ background: theme.black }}>
    <Series>
      <Series.Sequence durationInFrames={sceneDurations.opening} premountFor={30}>
        <OpeningMountainScene payload={payload} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={sceneDurations.student} premountFor={30}>
        <StudentRevealScene payload={payload} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={sceneDurations.achievement} premountFor={30}>
        <AchievementMedalScene payload={payload} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={sceneDurations.progress} premountFor={30}>
        <ProgressScene payload={payload} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={sceneDurations.final} premountFor={30}>
        <FinalMountainScene payload={payload} />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
