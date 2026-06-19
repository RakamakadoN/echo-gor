import { EchoGorTemplateVideo } from "./EchoGorTemplateVideo";
import { ArtistJourneyDocumentaryVideo } from "./artistJourneyDocumentary/ArtistJourneyDocumentaryVideo";
import { defaultPayloads } from "./defaultPayloads";
import { StudentAchievementCinematicVideo } from "./studentAchievementCinematic/StudentAchievementCinematicVideo";
import { TeacherSpotlightTrailerVideo } from "./teacherSpotlightTrailer/TeacherSpotlightTrailerVideo";

export const StudentAchievementVideo = () => (
  <EchoGorTemplateVideo payload={defaultPayloads["student-achievement"]} />
);

export const StudentAchievementCinematic = () => <StudentAchievementCinematicVideo />;

export const ConcertAnnouncementVideo = () => (
  <EchoGorTemplateVideo payload={defaultPayloads["concert-announcement"]} />
);

export const EventRecapVideo = () => <EchoGorTemplateVideo payload={defaultPayloads["event-recap"]} />;

export const TeacherProfileVideo = () => <EchoGorTemplateVideo payload={defaultPayloads["teacher-profile"]} />;

export const TeacherSpotlightTrailer = () => <TeacherSpotlightTrailerVideo />;

export const BranchWeeklyReportVideo = () => (
  <EchoGorTemplateVideo payload={defaultPayloads["branch-weekly-report"]} />
);

export const OwnerNetworkSummaryVideo = () => (
  <EchoGorTemplateVideo payload={defaultPayloads["owner-network-summary"]} />
);

export const ArtistJourneyVideo = () => <EchoGorTemplateVideo payload={defaultPayloads["artist-journey"]} />;

export const ArtistJourneyDocumentary = () => <ArtistJourneyDocumentaryVideo />;
