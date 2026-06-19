import "./index.css";
import { Composition, Folder } from "remotion";
import { AnimatedBarChart } from "./AnimatedBarChart";
import { resolveFormat } from "./components/EchoGorVisuals";
import { videoTemplates } from "./data/templateRegistry";
import { getArtistJourneyTotalFrames } from "./templates/artistJourneyDocumentary/timeline";
import {
  ArtistJourneyDocumentary,
  ArtistJourneyVideo,
  BranchWeeklyReportVideo,
  ConcertAnnouncementVideo,
  EventRecapVideo,
  OwnerNetworkSummaryVideo,
  StudentAchievementCinematic,
  StudentAchievementVideo,
  TeacherProfileVideo,
  TeacherSpotlightTrailer,
} from "./templates/templateComponents";

export const RemotionRoot: React.FC = () => {
  const reel = resolveFormat("reel-9x16");
  const landscape = resolveFormat("landscape-16x9");

  return (
    <>
      <Folder name="Echo-Gor">
        <Composition
          id="StudentAchievement"
          component={StudentAchievementVideo}
          durationInFrames={videoTemplates[0].defaultDurationSeconds * 30}
          fps={30}
          width={reel.width}
          height={reel.height}
        />
        <Composition
          id="StudentAchievementCinematic"
          component={StudentAchievementCinematic}
          durationInFrames={540}
          fps={30}
          width={reel.width}
          height={reel.height}
        />
        <Composition
          id="ConcertAnnouncement"
          component={ConcertAnnouncementVideo}
          durationInFrames={videoTemplates[1].defaultDurationSeconds * 30}
          fps={30}
          width={reel.width}
          height={reel.height}
        />
        <Composition
          id="EventRecap"
          component={EventRecapVideo}
          durationInFrames={videoTemplates[2].defaultDurationSeconds * 30}
          fps={30}
          width={reel.width}
          height={reel.height}
        />
        <Composition
          id="TeacherProfile"
          component={TeacherProfileVideo}
          durationInFrames={videoTemplates[3].defaultDurationSeconds * 30}
          fps={30}
          width={reel.width}
          height={reel.height}
        />
        <Composition
          id="TeacherSpotlightTrailer"
          component={TeacherSpotlightTrailer}
          durationInFrames={600}
          fps={30}
          width={reel.width}
          height={reel.height}
        />
        <Composition
          id="BranchWeeklyReport"
          component={BranchWeeklyReportVideo}
          durationInFrames={videoTemplates[4].defaultDurationSeconds * 30}
          fps={30}
          width={landscape.width}
          height={landscape.height}
        />
        <Composition
          id="OwnerNetworkSummary"
          component={OwnerNetworkSummaryVideo}
          durationInFrames={videoTemplates[5].defaultDurationSeconds * 30}
          fps={30}
          width={landscape.width}
          height={landscape.height}
        />
        <Composition
          id="ArtistJourney"
          component={ArtistJourneyVideo}
          durationInFrames={videoTemplates[6].defaultDurationSeconds * 30}
          fps={30}
          width={reel.width}
          height={reel.height}
        />
        <Composition
          id="ArtistJourneyDocumentary"
          component={ArtistJourneyDocumentary}
          durationInFrames={getArtistJourneyTotalFrames(60)}
          fps={30}
          width={reel.width}
          height={reel.height}
        />
      </Folder>

      <Folder name="Legacy">
        <Composition
          id="AnimatedBarChart"
          component={AnimatedBarChart}
          durationInFrames={180}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
    </>
  );
};
