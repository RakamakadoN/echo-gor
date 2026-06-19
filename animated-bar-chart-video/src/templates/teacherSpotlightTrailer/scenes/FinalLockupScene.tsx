import {
  PremiumStageBackdrop,
  SafeTrailerStage,
  TrailerLogo,
  TrailerTitle,
} from "../components/TeacherSpotlightElements";
import type { TeacherSpotlightPayload } from "../schema";

export const FinalLockupScene: React.FC<{ payload: TeacherSpotlightPayload }> = ({ payload }) => (
  <PremiumStageBackdrop intensity={1.05}>
    <SafeTrailerStage style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <TrailerLogo logoUrl={payload.logoUrl} centered />
      <div style={{ marginTop: 86 }}>
        <TrailerTitle
          eyebrow={`${payload.teacherName} / ${payload.branchName}`}
          title="Учитель, которого помнят"
          subtitle="Эхо Гор"
          delay={12}
          size={74}
          align="center"
        />
      </div>
    </SafeTrailerStage>
  </PremiumStageBackdrop>
);
