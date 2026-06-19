import { PremiumStageBackdrop, SafeTrailerStage, TrailerLogo, TrailerTitle } from "../components/TeacherSpotlightElements";
import type { TeacherSpotlightPayload } from "../schema";

export const ColdOpenScene: React.FC<{ payload: TeacherSpotlightPayload }> = ({ payload }) => (
  <PremiumStageBackdrop intensity={0.82}>
    <SafeTrailerStage style={{ justifyContent: "space-between" }}>
      <TrailerLogo logoUrl={payload.logoUrl} />
      <div style={{ paddingBottom: 210 }}>
        <TrailerTitle
          eyebrow={`${payload.branchName} / премьера наставника`}
          title="Наставник сцены"
          subtitle="Трейлер преподавателя, который ведет учеников к большому свету."
          delay={8}
          size={84}
        />
      </div>
    </SafeTrailerStage>
  </PremiumStageBackdrop>
);
