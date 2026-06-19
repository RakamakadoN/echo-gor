import {
  ChapterTitle,
  DocumentaryBackdrop,
  MediaMoment,
  SafeDocStage,
  StatLine,
} from "../components/DocumentaryElements";
import type { ArtistJourneyDocumentaryPayload, JourneyMoment } from "../schema";

const buildPracticeMoments = (payload: ArtistJourneyDocumentaryPayload): JourneyMoment[] => {
  const moments = [
    ...payload.timeline.achievements,
    ...payload.timeline.concerts,
    ...(payload.timeline.firstLesson ? [payload.timeline.firstLesson] : []),
  ];

  if (moments.length >= 3) {
    return moments.slice(0, 3);
  }

  return [
    ...moments,
    {
      id: "practice-fallback",
      title: "Репетиции и характер",
      date: "каждый сезон",
      description: "Техника, дисциплина и постоянство.",
    },
  ].slice(0, 3);
};

export const DisciplineYearsScene: React.FC<{ payload: ArtistJourneyDocumentaryPayload }> = ({ payload }) => {
  const moments = buildPracticeMoments(payload);

  return (
    <DocumentaryBackdrop mountainIntensity={0.68} lightSide="right" fogTop={1040}>
      <SafeDocStage style={{ justifyContent: "center" }}>
        <ChapterTitle
          eyebrow="глава II"
          title="Годы дисциплины"
          subtitle="За каждым уверенным выходом на сцену стоят сотни повторений."
          delay={4}
          size={68}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 52 }}>
          <div style={{ display: "grid", gap: 22 }}>
            <MediaMoment moment={moments[0]} height={330} delay={22} />
            <MediaMoment moment={moments[1] || moments[0]} height={330} delay={34} />
          </div>
          <MediaMoment moment={moments[2] || moments[0]} height={682} delay={46} large />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28, marginTop: 48 }}>
          <StatLine label="лет в школе" value={payload.summary.yearsInSchool} delay={58} />
          <StatLine label="занятий" value={payload.summary.lessonsCount || "100+"} delay={68} />
          <StatLine label="достижений" value={payload.summary.achievementsCount} delay={78} />
        </div>
      </SafeDocStage>
    </DocumentaryBackdrop>
  );
};
