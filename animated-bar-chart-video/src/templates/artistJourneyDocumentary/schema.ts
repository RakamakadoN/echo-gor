export type ArtistJourneyDurationSeconds = 30 | 45 | 60;

export type JourneyMoment = {
  id: string;
  title: string;
  date: string;
  location?: string;
  description?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
};

export type ArtistJourneyDocumentaryPayload = {
  student: {
    id: string;
    name: string;
    currentAge?: number;
    firstPhotoUrl?: string;
    currentPhotoUrl?: string;
  };
  school: {
    name: string;
    branchName: string;
    logoUrl?: string;
  };
  timeline: {
    firstLesson?: JourneyMoment;
    firstPerformance?: JourneyMoment;
    festivals: JourneyMoment[];
    diplomas: JourneyMoment[];
    achievements: JourneyMoment[];
    concerts: JourneyMoment[];
  };
  summary: {
    yearsInSchool: number;
    lessonsCount?: number;
    performancesCount: number;
    festivalsCount: number;
    diplomasCount: number;
    achievementsCount: number;
  };
  parentsQuote?: {
    text: string;
    author?: string;
  };
  teacherQuote?: {
    text: string;
    author: string;
  };
  durationSeconds?: ArtistJourneyDurationSeconds;
};

export const ARTIST_JOURNEY_DOCUMENTARY_FPS = 30;
