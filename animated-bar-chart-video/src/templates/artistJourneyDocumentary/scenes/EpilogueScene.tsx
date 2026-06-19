import { ChapterTitle, DocumentaryBackdrop, DocumentaryLogo, SafeDocStage } from "../components/DocumentaryElements";
import type { ArtistJourneyDocumentaryPayload } from "../schema";

export const EpilogueScene: React.FC<{ payload: ArtistJourneyDocumentaryPayload }> = ({ payload }) => (
  <DocumentaryBackdrop mountainIntensity={1.08} lightSide="center" fogTop={760}>
    <SafeDocStage style={{ justifyContent: "center", textAlign: "center", alignItems: "center" }}>
      <DocumentaryLogo logoUrl={payload.school.logoUrl} centered />
      <div style={{ marginTop: 92 }}>
        <ChapterTitle
          eyebrow={`${payload.student.name} / ${payload.school.branchName}`}
          title="История продолжается..."
          subtitle="Новые сцены, новые вершины, новые главы пути."
          delay={16}
          align="center"
          size={76}
        />
      </div>
    </SafeDocStage>
  </DocumentaryBackdrop>
);
