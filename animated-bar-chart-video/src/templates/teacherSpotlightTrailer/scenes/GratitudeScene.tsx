import { GratitudeQuote, PremiumStageBackdrop, SafeTrailerStage, TrailerTitle } from "../components/TeacherSpotlightElements";
import type { TeacherSpotlightPayload } from "../schema";

export const GratitudeScene: React.FC<{ payload: TeacherSpotlightPayload }> = ({ payload }) => (
  <PremiumStageBackdrop intensity={0.62}>
    <SafeTrailerStage style={{ justifyContent: "center" }}>
      <TrailerTitle eyebrow="голос учеников" title="То, что остается после занятия" delay={4} size={58} />
      <div style={{ marginTop: 72 }}>
        <GratitudeQuote thanks={payload.studentThanks} delay={22} />
      </div>
    </SafeTrailerStage>
  </PremiumStageBackdrop>
);
