import { ArchivePhoto, ChapterTitle, DocumentaryBackdrop, SafeDocStage } from "../components/DocumentaryElements";
import type { ArtistJourneyDocumentaryPayload, JourneyMoment } from "../schema";

const fallbackMoment: JourneyMoment = {
  id: "first-lesson-fallback",
  title: "Первое занятие",
  date: "дата не указана",
  description: "Первый шаг в зал, с которого началась история.",
};

export const FirstFrameScene: React.FC<{ payload: ArtistJourneyDocumentaryPayload }> = ({ payload }) => {
  const moment = payload.timeline.firstLesson || fallbackMoment;

  return (
    <DocumentaryBackdrop mountainIntensity={0.76} lightSide="left" fogTop={930}>
      <SafeDocStage style={{ justifyContent: "center" }}>
        <ArchivePhoto moment={moment} photoUrl={payload.student.firstPhotoUrl} delay={8} />
        <div style={{ marginTop: 54 }}>
          <ChapterTitle
            eyebrow="архив / начало"
            title="Первое занятие"
            subtitle={moment.description || "Один шаг в зал стал началом большого пути."}
            delay={30}
            size={64}
          />
        </div>
      </SafeDocStage>
    </DocumentaryBackdrop>
  );
};
