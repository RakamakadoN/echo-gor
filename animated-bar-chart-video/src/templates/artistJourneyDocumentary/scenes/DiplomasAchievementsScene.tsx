import {
  ChapterTitle,
  DiplomaWall,
  DocumentaryBackdrop,
  SafeDocStage,
  StatLine,
} from "../components/DocumentaryElements";
import type { ArtistJourneyDocumentaryPayload, JourneyMoment } from "../schema";

const buildAwardMoments = (payload: ArtistJourneyDocumentaryPayload): JourneyMoment[] => {
  const moments = [...payload.timeline.diplomas, ...payload.timeline.achievements];

  if (moments.length > 0) {
    return moments;
  }

  return [
    {
      id: "award-fallback",
      title: "Достижения открыты",
      date: "в процессе",
      description: "Главная награда пути - рост характера и уверенности.",
    },
  ];
};

export const DiplomasAchievementsScene: React.FC<{ payload: ArtistJourneyDocumentaryPayload }> = ({ payload }) => {
  const moments = buildAwardMoments(payload);

  return (
    <DocumentaryBackdrop mountainIntensity={0.62} lightSide="right" fogTop={1060}>
      <SafeDocStage style={{ justifyContent: "center" }}>
        <ChapterTitle
          eyebrow="признание"
          title="Дипломы и достижения"
          subtitle="Документы фиксируют результат. Но настоящая победа видна в осанке."
          delay={4}
          size={64}
        />
        <div style={{ marginTop: 46 }}>
          <DiplomaWall moments={moments} delay={26} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 34, marginTop: 44 }}>
          <StatLine label="диплома" value={payload.summary.diplomasCount} delay={68} />
          <StatLine label="достижений" value={payload.summary.achievementsCount} delay={78} />
        </div>
      </SafeDocStage>
    </DocumentaryBackdrop>
  );
};
