export type Vertical =
  | "SY_INDIA"
  | "SY_UAE"
  | "INTERIOR"
  | "SQUARE_CONNECT"
  | "UM";

export type SocialPlatform =
  | "INSTAGRAM"
  | "FACEBOOK"
  | "LINKEDIN"
  | "YOUTUBE"
  | "PINTEREST";

export type CalendarItemStatus =
  | "PLANNED"
  | "SCRIPT_IN_PROGRESS"
  | "SCRIPT_READY"
  | "VIDEO_UPLOADED"
  | "SCHEDULED"
  | "PUBLISHED"
  | "DELAYED"
  | "RESCHEDULED"
  | "CANCELLED";

export type ContentType =
  | "REEL"
  | "CAROUSEL"
  | "STATIC"
  | "STORY"
  | "YOUTUBE_VIDEO"
  | "SHORT";

export type ContentCategory =
  | "LISTING"
  | "EDUCATION"
  | "BRAND"
  | "TESTIMONIAL"
  | "FESTIVE"
  | "MARKET_UPDATE"
  | "TIPS"
  | "BEHIND_SCENES";

export type DelayReason =
  | "SHOOT_PENDING"
  | "SHOOT_DELAYED"
  | "EDIT_DELAYED"
  | "APPROVAL_PENDING"
  | "CREATIVE_NOT_READY"
  | "TALENT_UNAVAILABLE"
  | "TECHNICAL_ISSUE"
  | "STRATEGY_CHANGE"
  | "OTHER";

export type ScriptStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "REJECTED";

export interface SocialMetrics {
  vertical: Vertical;
  platform: SocialPlatform | "ALL";
  period: { from: string; to: string };
  followers: number;
  follows: number;
  unfollows: number;
  netFollowers: number;
  views: number;
  reach: number;
  impressions: number;
  interactions: number;
  linkClicks: number;
  profileVisits: number;
  totalContacts: number;
  postsPublished: number;
  videosPublished: number;
  staticsPublished: number;
  // deltas vs previous period
  deltaFollowers?: number;
  deltaReach?: number;
  deltaInteractions?: number;
  deltaViews?: number;
}

export interface MonthlySnapshot {
  month: string; // "Jan", "Feb" ...
  followers: number;
  follows: number;
  unfollows: number;
  netFollowers: number;
}

export interface ContentCalendarItem {
  id: string;
  vertical: Vertical;
  platforms: SocialPlatform[];
  contentType: ContentType;
  category: ContentCategory;
  title: string;
  hook?: string;
  topic?: string;
  assignedTo?: { id: string; name: string; image?: string };
  plannedDate: string;
  scheduledAt?: string;
  publishedAt?: string;
  status: CalendarItemStatus;
  delayReason?: DelayReason;
  delayNote?: string;
  rescheduledFrom?: string;
  videoUrl?: string;
  caption?: string;
  instagramLink?: string;
  youtubeLink?: string;
  linkedinLink?: string;
  facebookLink?: string;
  aiConfidence?: number;
  script?: ContentScript;
}

export interface ContentScript {
  id: string;
  calendarItemId: string;
  version: number;
  status: ScriptStatus;
  hook?: string;
  body?: string;
  cta?: string;
  captionInsta?: string;
  captionLinkedin?: string;
  captionYoutube?: string;
  estimatedDuration?: number;
  aiGenerated: boolean;
}

export const VERTICAL_LABELS: Record<Vertical, string> = {
  SY_INDIA:       "Square Yards India",
  SY_UAE:         "Square Yards UAE",
  INTERIOR:       "Interior Company",
  SQUARE_CONNECT: "Square Connect",
  UM:             "UM",
};

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  INSTAGRAM:  "Instagram",
  FACEBOOK:   "Facebook",
  LINKEDIN:   "LinkedIn",
  YOUTUBE:    "YouTube",
  PINTEREST:  "Pinterest",
};

export const DELAY_REASON_LABELS: Record<DelayReason, string> = {
  SHOOT_PENDING:      "Shoot Pending — not yet filmed",
  SHOOT_DELAYED:      "Delayed Due to Shoot",
  EDIT_DELAYED:       "Delayed Due to Editing",
  APPROVAL_PENDING:   "Waiting for Internal Approval",
  CREATIVE_NOT_READY: "Creative / Graphic Not Ready",
  TALENT_UNAVAILABLE: "Talent / On-Camera Person Unavailable",
  TECHNICAL_ISSUE:    "Technical or Platform Issue",
  STRATEGY_CHANGE:    "Topic Changed / Strategy Update",
  OTHER:              "Other",
};

export const STATUS_CONFIG: Record<
  CalendarItemStatus,
  { label: string; color: string; bg: string }
> = {
  PLANNED:           { label: "Planned",         color: "text-gray-600",  bg: "bg-gray-100" },
  SCRIPT_IN_PROGRESS:{ label: "Script WIP",      color: "text-blue-600",  bg: "bg-blue-50" },
  SCRIPT_READY:      { label: "Script Ready",    color: "text-indigo-600",bg: "bg-indigo-50" },
  VIDEO_UPLOADED:    { label: "Video Uploaded",  color: "text-violet-600",bg: "bg-violet-50" },
  SCHEDULED:         { label: "Scheduled",       color: "text-sky-700",   bg: "bg-sky-50" },
  PUBLISHED:         { label: "Published",       color: "text-green-700", bg: "bg-green-50" },
  DELAYED:           { label: "Delayed",         color: "text-amber-700", bg: "bg-amber-50" },
  RESCHEDULED:       { label: "Rescheduled",     color: "text-orange-700",bg: "bg-orange-50" },
  CANCELLED:         { label: "Cancelled",       color: "text-red-600",   bg: "bg-red-50" },
};
