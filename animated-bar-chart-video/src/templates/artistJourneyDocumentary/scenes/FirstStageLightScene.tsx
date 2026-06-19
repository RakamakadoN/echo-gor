import { ChapterTitle, DocumentaryBackdrop, MediaMoment, SafeDocStage } from "../components/DocumentaryElements";
import type { ArtistJourneyDocumentaryPayload, JourneyMoment } from "../schema";

const fallbackMoment: JourneyMoment = {
  id: "first-stage-fallback",
  title: "Первое выступление",
  date: "дата не указана",
  location: "Сцена Эхо Гор",
  description: "Первый выход, когда зал становится частью истории.",
};

export const FirstStageLightScene: React.FC<{ payload: ArtistJourneyDocumentaryPayload }> = ({ payload }) => {
  const moment = payload.timeline.firstPerformance || fallbackMoment;

  return (
    <DocumentaryBackdrop mountainIntensity={0.58} lightSide="center" fogTop={990}>
      <SafeDocStage style={{ justifyContent: "center" }}>
        <ChapterTitle
          eyebrow={moment.location || "свет сцены"}
          title="Первый свет сцены"
          subtitle={moment.description || "Первый выход, первые аплодисменты, первая настоящая смелость."}
          delay={4}
          size={70}
        />
        <div style={{ marginTop: 54 }}>
          <MediaMoment moment={moment} height={820} delay={26} large />
        </div>
      </SafeDocStage>
    </DocumentaryBackdrop>
  );
};
