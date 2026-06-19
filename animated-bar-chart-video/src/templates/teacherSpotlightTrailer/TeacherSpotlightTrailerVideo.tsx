import { AbsoluteFill, Series } from "remotion";
import { defaultTeacherSpotlightPayload } from "./defaultPayload";
import { AchievementsScene } from "./scenes/AchievementsScene";
import { ColdOpenScene } from "./scenes/ColdOpenScene";
import { FinalLockupScene } from "./scenes/FinalLockupScene";
import { GratitudeScene } from "./scenes/GratitudeScene";
import { GroupsCraftScene } from "./scenes/GroupsCraftScene";
import { HeroPortraitScene } from "./scenes/HeroPortraitScene";
import { LegacyStatsScene } from "./scenes/LegacyStatsScene";
import type { TeacherSpotlightPayload } from "./schema";

export type TeacherSpotlightTrailerVideoProps = {
  payload?: TeacherSpotlightPayload;
};

const durations = {
  coldOpen: 90,
  hero: 105,
  stats: 90,
  groups: 120,
  achievements: 105,
  gratitude: 60,
  final: 30,
};

export const TeacherSpotlightTrailerVideo: React.FC<TeacherSpotlightTrailerVideoProps> = ({
  payload = defaultTeacherSpotlightPayload,
}) => (
  <AbsoluteFill style={{ background: "#030303" }}>
    <Series>
      <Series.Sequence durationInFrames={durations.coldOpen} premountFor={30}>
        <ColdOpenScene payload={payload} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={durations.hero} premountFor={30}>
        <HeroPortraitScene payload={payload} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={durations.stats} premountFor={30}>
        <LegacyStatsScene payload={payload} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={durations.groups} premountFor={30}>
        <GroupsCraftScene payload={payload} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={durations.achievements} premountFor={30}>
        <AchievementsScene payload={payload} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={durations.gratitude} premountFor={30}>
        <GratitudeScene payload={payload} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={durations.final} premountFor={30}>
        <FinalLockupScene payload={payload} />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
