/**
 * Centralised permission helpers for SquareLabs.
 *
 * AppSection enum mirrors the Prisma schema.
 * Each helper accepts the session user object (from next-auth) and returns
 * a boolean so it can be used in both server components and API routes.
 */

export type AppSection =
  | "DASHBOARD"
  | "SOCIAL"
  | "DESIGN_OPS"
  | "GMB"
  | "PORTALS"
  | "SETTINGS"
  | "TEAM_HUB";

export type UserRole =
  | "ADMIN"
  | "HEAD_OF_MARKETING"
  | "TEAM_LEAD"
  | "TEAM_MEMBER"
  | "HR_VIEWER";

export interface SessionUser {
  id:             string;
  name?:          string | null;
  email?:         string | null;
  role?:          UserRole;
  department?:    string | null;
  accessSections?: AppSection[];
}

/** ADMIN users have unrestricted access to everything. */
export function isAdmin(user?: SessionUser | null): boolean {
  return user?.role === "ADMIN";
}

/**
 * Returns true if the user can access the given section.
 * ADMINs always pass. If accessSections is empty/unset (user not yet
 * assigned restrictions), treat as full access. Only restrict when
 * accessSections is explicitly populated with specific sections.
 */
export function canAccess(user?: SessionUser | null, section?: AppSection): boolean {
  if (!user) return true;          // session loading — show everything
  if (isAdmin(user)) return true;  // admins see all
  if (!section) return true;
  const sections = user.accessSections ?? [];
  if (sections.length === 0) return true;  // no restrictions configured yet
  return sections.includes(section);
}

/** Returns the list of sections a user can access (for sidebar rendering). */
export function allowedSections(user?: SessionUser | null): AppSection[] {
  if (!user) return [];
  if (isAdmin(user)) return ["DASHBOARD","SOCIAL","DESIGN_OPS","GMB","PORTALS","SETTINGS","TEAM_HUB"];
  return user.accessSections ?? ["DASHBOARD"];
}

/** Role display labels */
export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN:             "Admin",
  HEAD_OF_MARKETING: "Head of Marketing",
  TEAM_LEAD:         "Team Lead",
  TEAM_MEMBER:       "Team Member",
  HR_VIEWER:         "HR Viewer",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN:             "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  HEAD_OF_MARKETING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  TEAM_LEAD:         "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  TEAM_MEMBER:       "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  HR_VIEWER:         "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export const SECTION_LABELS: Record<AppSection, string> = {
  DASHBOARD:  "Dashboard",
  SOCIAL:     "Social Calendar",
  DESIGN_OPS: "Design Ops",
  GMB:        "GMB / Portals",
  PORTALS:    "Portals",
  SETTINGS:   "Settings",
  TEAM_HUB:   "Team Hub",
};

export const SECTION_ICONS: Record<AppSection, string> = {
  DASHBOARD:  "🏠",
  SOCIAL:     "📅",
  DESIGN_OPS: "🎬",
  GMB:        "📍",
  PORTALS:    "⭐",
  SETTINGS:   "⚙️",
  TEAM_HUB:   "👥",
};

export const ALL_SECTIONS: AppSection[] = [
  "DASHBOARD","SOCIAL","DESIGN_OPS","GMB","PORTALS","SETTINGS","TEAM_HUB",
];
