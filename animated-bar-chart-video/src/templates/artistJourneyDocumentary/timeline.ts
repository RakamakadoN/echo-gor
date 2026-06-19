import type { ArtistJourneyDurationSeconds } from "./schema";

export type ArtistJourneySceneDuration = {
  prologue: number;
  firstFrame: number;
  discipline: number;
  firstStage: number;
  festivalsConcerts: number;
  diplomasAchievements: number;
  parentsPride: number;
  epilogue: number;
};

export const resolveArtistJourneyTimeline = (
  durationSeconds: ArtistJourneyDurationSeconds = 60,
): ArtistJourneySceneDuration => {
  if (durationSeconds === 30) {
    return {
      prologue: 90,
      firstFrame: 120,
      discipline: 150,
      firstStage: 150,
      festivalsConcerts: 150,
      diplomasAchievements: 120,
      parentsPride: 60,
      epilogue: 60,
    };
  }

  if (durationSeconds === 45) {
    return {
      prologue: 150,
      firstFrame: 180,
      discipline: 210,
      firstStage: 210,
      festivalsConcerts: 210,
      diplomasAchievements: 180,
      parentsPride: 120,
      epilogue: 90,
    };
  }

  return {
    prologue: 180,
    firstFrame: 210,
    discipline: 270,
    firstStage: 240,
    festivalsConcerts: 300,
    diplomasAchievements: 240,
    parentsPride: 180,
    epilogue: 180,
  };
};

export const getArtistJourneyTotalFrames = (durationSeconds: ArtistJourneyDurationSeconds = 60) => {
  const durations = resolveArtistJourneyTimeline(durationSeconds);
  return Object.values(durations).reduce((sum, duration) => sum + duration, 0);
};
