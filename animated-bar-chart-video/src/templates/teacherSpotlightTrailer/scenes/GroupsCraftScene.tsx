import { GroupBadgeWall, PremiumStageBackdrop, SafeTrailerStage, TrailerTitle } from "../components/TeacherSpotlightElements";
import type { TeacherSpotlightPayload } from "../schema";

export const GroupsCraftScene: React.FC<{ payload: TeacherSpotlightPayload }> = ({ payload }) => (
  <PremiumStageBackdrop intensity={0.72}>
    <SafeTrailerStage style={{ justifyContent: "center" }}>
      <TrailerTitle
        eyebrow="craft"
        title="Группы, где рождается сцена"
        subtitle="Каждая группа - отдельная энергия, дисциплина и характер."
        delay={4}
        size={64}
      />
      <div style={{ marginTop: 54 }}>
        <GroupBadgeWall groups={payload.groups} delay={26} />
      </div>
    </SafeTrailerStage>
  </PremiumStageBackdrop>
);
