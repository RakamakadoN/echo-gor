import {
  PremiumStageBackdrop,
  SafeTrailerStage,
  TeacherPortrait,
  TrailerTitle,
} from "../components/TeacherSpotlightElements";
import type { TeacherSpotlightPayload } from "../schema";

export const HeroPortraitScene: React.FC<{ payload: TeacherSpotlightPayload }> = ({ payload }) => (
  <PremiumStageBackdrop intensity={0.9}>
    <SafeTrailerStage style={{ justifyContent: "center" }}>
      <TeacherPortrait name={payload.teacherName} photoUrl={payload.photoUrl} delay={4} />
      <div style={{ marginTop: 50 }}>
        <TrailerTitle
          eyebrow={payload.specialties.slice(0, 2).join(" / ")}
          title={payload.teacherName}
          subtitle={payload.specialties.join(" • ")}
          delay={20}
          size={74}
        />
      </div>
    </SafeTrailerStage>
  </PremiumStageBackdrop>
);
