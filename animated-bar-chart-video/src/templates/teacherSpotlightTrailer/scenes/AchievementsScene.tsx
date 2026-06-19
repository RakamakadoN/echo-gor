import {
  AchievementWall,
  PremiumStageBackdrop,
  SafeTrailerStage,
  TrailerTitle,
} from "../components/TeacherSpotlightElements";
import type { TeacherSpotlightPayload } from "../schema";

export const AchievementsScene: React.FC<{ payload: TeacherSpotlightPayload }> = ({ payload }) => (
  <PremiumStageBackdrop intensity={0.76}>
    <SafeTrailerStage style={{ justifyContent: "center" }}>
      <TrailerTitle
        eyebrow="awards / authority"
        title="Достижения наставника"
        subtitle="Авторитет преподавателя складывается из сцены, дисциплины и результата учеников."
        delay={4}
        size={62}
      />
      <div style={{ marginTop: 46 }}>
        <AchievementWall achievements={payload.achievements} delay={24} />
      </div>
    </SafeTrailerStage>
  </PremiumStageBackdrop>
);
