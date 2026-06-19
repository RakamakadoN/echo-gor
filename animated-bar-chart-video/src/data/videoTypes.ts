export type VideoTemplateId =
  | "student-achievement"
  | "concert-announcement"
  | "event-recap"
  | "teacher-profile"
  | "teacher-spotlight"
  | "branch-weekly-report"
  | "owner-network-summary"
  | "artist-journey";

export type VideoFormat = "reel-9x16" | "story-9x16" | "square-1x1" | "landscape-16x9";

export type VideoAudience = "parents" | "teachers" | "owner" | "students" | "public";

export type MediaAsset = {
  id: string;
  type: "image" | "video" | "audio";
  url: string;
  title?: string;
  tags?: string[];
};

export type PersonSummary = {
  id: string;
  name: string;
  photoUrl?: string;
};

export type MetricItem = {
  label: string;
  value: string;
  delta?: string;
  tone?: "gold" | "success" | "warning" | "danger" | "neutral";
};

export type VideoScene = {
  id: string;
  title: string;
  subtitle?: string;
  body?: string;
  durationInFrames: number;
  kind: "title" | "portrait" | "montage" | "metrics" | "quote" | "cta" | "timeline";
  metrics?: MetricItem[];
  media?: MediaAsset[];
};

export type EchoGorVideoPayload = {
  templateId: VideoTemplateId;
  templateVersion: string;
  format: VideoFormat;
  title: string;
  subtitle?: string;
  audience: VideoAudience[];
  durationInFrames: number;
  fps: number;
  entity: {
    type: "student" | "teacher" | "branch" | "event" | "network";
    id: string;
    name: string;
  };
  brand: {
    schoolName: string;
    branchName?: string;
    city?: string;
    logoUrl?: string;
  };
  people?: {
    student?: PersonSummary;
    teacher?: PersonSummary;
    branchManager?: PersonSummary;
  };
  event?: {
    name: string;
    date: string;
    time?: string;
    location?: string;
    address?: string;
  };
  metrics?: MetricItem[];
  quote?: {
    text: string;
    author: string;
  };
  callToAction?: {
    label: string;
    detail?: string;
    url?: string;
  };
  media: MediaAsset[];
  scenes: VideoScene[];
};

export type VideoTemplateDefinition = {
  id: VideoTemplateId;
  version: string;
  name: string;
  goal: string;
  audience: VideoAudience[];
  defaultDurationSeconds: number;
  supportedFormats: VideoFormat[];
  requiredData: string[];
  visualStyle: string;
  scenePlan: Array<Pick<VideoScene, "id" | "title" | "kind" | "durationInFrames">>;
};
