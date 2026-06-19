import {
  ChapterTitle,
  DocumentaryBackdrop,
  MediaMoment,
  SafeDocStage,
  TimelineRail,
} from "../components/DocumentaryElements";
import type { ArtistJourneyDocumentaryPayload, JourneyMoment } from "../schema";

const buildPublicMoments = (payload: ArtistJourneyDocumentaryPayload): JourneyMoment[] => {
  const moments = [...payload.timeline.festivals, ...payload.timeline.concerts];

  if (moments.length > 0) {
    return moments;
  }

  return [
    {
      id: "public-fallback",
      title: "Концерты и фестивали",
      date: "весь путь",
      location: payload.school.branchName,
      description: "События, где ученик становится частью большой команды.",
    },
  ];
};

export const FestivalsConcertsScene: React.FC<{ payload: ArtistJourneyDocumentaryPayload }> = ({ payload }) => {
  const moments = buildPublicMoments(payload);

  return (
    <DocumentaryBackdrop mountainIntensity={0.72} lightSide="left" fogTop={980}>
      <SafeDocStage style={{ justifyContent: "center" }}>
        <ChapterTitle
          eyebrow="публичная история"
          title="Фестивали и концерты"
          subtitle="Каждая сцена добавляла уверенности. Каждый зал становился новой вершиной."
          delay={4}
          size={64}
        />
        <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 44, alignItems: "center", marginTop: 54 }}>
          <TimelineRail moments={moments} delay={24} />
          <div style={{ display: "grid", gap: 20 }}>
            <MediaMoment moment={moments[0]} height={360} delay={34} />
            <MediaMoment moment={moments[1] || moments[0]} height={360} delay={48} />
          </div>
        </div>
      </SafeDocStage>
    </DocumentaryBackdrop>
  );
};
