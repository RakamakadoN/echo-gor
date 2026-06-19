import { DocumentaryBackdrop, DocumentaryLogo, ChapterTitle, SafeDocStage } from "../components/DocumentaryElements";
import type { ArtistJourneyDocumentaryPayload } from "../schema";

export const PrologueMountainsScene: React.FC<{ payload: ArtistJourneyDocumentaryPayload }> = ({ payload }) => (
  <DocumentaryBackdrop mountainIntensity={0.96} lightSide="center" fogTop={720}>
    <SafeDocStage style={{ justifyContent: "space-between" }}>
      <DocumentaryLogo logoUrl={payload.school.logoUrl} />
      <div style={{ paddingBottom: 210 }}>
        <ChapterTitle
          eyebrow={`${payload.school.branchName} / ${payload.summary.yearsInSchool} лет пути`}
          title={payload.student.name}
          subtitle="Путь артиста начинается тихо. Потом он становится историей."
          delay={12}
          size={92}
        />
      </div>
    </SafeDocStage>
  </DocumentaryBackdrop>
);
