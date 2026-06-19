import { PremiumStageBackdrop, SafeTrailerStage, StatCounter, TrailerTitle } from "../components/TeacherSpotlightElements";
import type { TeacherSpotlightPayload } from "../schema";

export const LegacyStatsScene: React.FC<{ payload: TeacherSpotlightPayload }> = ({ payload }) => (
  <PremiumStageBackdrop intensity={0.78}>
    <SafeTrailerStage style={{ justifyContent: "center" }}>
      <TrailerTitle
        eyebrow="legacy"
        title="Опыт, который слышит зал"
        subtitle="Стаж, концерты и группы собираются в один сценический почерк."
        delay={4}
        size={64}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 22, marginTop: 50 }}>
        <StatCounter label="лет стажа" value={payload.experienceYears} delay={24} />
        <StatCounter label="концертов подготовлено" value={payload.concertsCount} delay={36} />
        <StatCounter label="группы под руководством" value={payload.groups.length} delay={48} />
      </div>
    </SafeTrailerStage>
  </PremiumStageBackdrop>
);
