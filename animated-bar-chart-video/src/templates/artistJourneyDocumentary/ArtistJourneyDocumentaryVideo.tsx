import { AbsoluteFill, Series } from "remotion";
import { defaultArtistJourneyDocumentaryPayload } from "./defaultPayload";
import { DiplomasAchievementsScene } from "./scenes/DiplomasAchievementsScene";
import { DisciplineYearsScene } from "./scenes/DisciplineYearsScene";
import { EpilogueScene } from "./scenes/EpilogueScene";
import { FestivalsConcertsScene } from "./scenes/FestivalsConcertsScene";
import { FirstFrameScene } from "./scenes/FirstFrameScene";
import { FirstStageLightScene } from "./scenes/FirstStageLightScene";
import { ParentsPrideScene } from "./scenes/ParentsPrideScene";
import { PrologueMountainsScene } from "./scenes/PrologueMountainsScene";
import type { ArtistJourneyDocumentaryPayload } from "./schema";
import { resolveArtistJourneyTimeline } from "./timeline";

export type ArtistJourneyDocumentaryVideoProps = {
  payload?: ArtistJourneyDocumentaryPayload;
};

export const ArtistJourneyDocumentaryVideo: React.FC<ArtistJourneyDocumentaryVideoProps> = ({
  payload = defaultArtistJourneyDocumentaryPayload,
}) => {
  const durations = resolveArtistJourneyTimeline(payload.durationSeconds || 60);

  return (
    <AbsoluteFill style={{ background: "#030405" }}>
      <Series>
        <Series.Sequence durationInFrames={durations.prologue} premountFor={30}>
          <PrologueMountainsScene payload={payload} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={durations.firstFrame} premountFor={30}>
          <FirstFrameScene payload={payload} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={durations.discipline} premountFor={30}>
          <DisciplineYearsScene payload={payload} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={durations.firstStage} premountFor={30}>
          <FirstStageLightScene payload={payload} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={durations.festivalsConcerts} premountFor={30}>
          <FestivalsConcertsScene payload={payload} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={durations.diplomasAchievements} premountFor={30}>
          <DiplomasAchievementsScene payload={payload} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={durations.parentsPride} premountFor={30}>
          <ParentsPrideScene payload={payload} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={durations.epilogue} premountFor={30}>
          <EpilogueScene payload={payload} />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
