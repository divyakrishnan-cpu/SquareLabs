"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart2, MessageSquare, CalendarDays, Settings,
  ChevronDown, ChevronRight, Share2, Menu, X, MapPin,
  Sun, Moon, Clapperboard, Users, ShieldCheck, GitBranch,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { canAccess, type AppSection, type SessionUser } from "@/lib/permissions";

type NavItem  = { label: string; href: string; icon: any; section?: AppSection };
type NavGroup = { label: string; icon: any; section?: AppSection; children: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Social", icon: Share2, section: "SOCIAL",
    children: [
      { label: "Dashboard",        href: "/social/dashboard", icon: BarChart2,     section: "SOCIAL" },
      { label: "Content Calendar", href: "/social/calendar",  icon: CalendarDays,  section: "SOCIAL" },
      { label: "ORM — Comments",   href: "/social/orm",       icon: MessageSquare, section: "SOCIAL" },
      { label: "GMB Ratings",      href: "/social/orm/gmb",   icon: MapPin,        section: "GMB"    },
    ],
  },
  {
    label: "Design Ops", icon: Clapperboard, section: "DESIGN_OPS",
    children: [
      { label: "Request Tracker", href: "/design-ops", icon: Clapperboard, section: "DESIGN_OPS" },
    ],
  },
  {
    label: "Team", icon: Users, section: "TEAM_HUB",
    children: [
      { label: "Members",     href: "/team",             icon: Users,       section: "TEAM_HUB" },
      { label: "Permissions", href: "/team?tab=permissions", icon: ShieldCheck, section: "TEAM_HUB" },
      { label: "Org Chart",   href: "/team?tab=org",     icon: GitBranch,   section: "TEAM_HUB" },
    ],
  },
];

const BOTTOM_NAV: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings, section: "SETTINGS" },
];

export function Sidebar() {
  const pathname    = usePathname();
  const { data: session, status } = useSession();
  const sessionUser = session?.user as SessionUser | undefined;
  const isLoading = status === "loading";

  const [collapsed,  setCollapsed]  = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(["Social", "Design Ops", "Team"]);
  const { theme, toggle } = useTheme();

  function toggleGroup(label: string) {
    setOpenGroups(prev =>
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    );
  }

  // While session is loading, show all nav items to avoid flash of empty sidebar.
  // Once loaded, filter by the user's actual permissions.
  const visibleNav = isLoading
    ? NAV
    : NAV
        .filter(g => !g.section || canAccess(sessionUser, g.section))
        .map(g => ({ ...g, children: g.children.filter(c => !c.section || canAccess(sessionUser, c.section)) }))
        .filter(g => g.children.length > 0);

  const visibleBottom = isLoading
    ? BOTTOM_NAV
    : BOTTOM_NAV.filter(i => !i.section || canAccess(sessionUser, i.section));

  const userName = sessionUser?.name ?? "User";
  const initials = userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      <div className={cn("fixed inset-0 bg-black/40 z-20 lg:hidden", collapsed ? "hidden" : "block")}
        onClick={() => setCollapsed(true)} />

      <aside className={cn(
        "fixed top-0 left-0 h-full flex flex-col z-30 transition-all duration-200",
        "bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-700",
        collapsed ? "w-16" : "w-56"
      )}>
        {/* Logo */}
        <div className={cn("flex items-center gap-2 px-4 h-14 shrink-0 border-b border-gray-100 dark:border-gray-700")}>
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">SY</span>
          </div>
          {!collapsed && <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">SquareLabs</span>}
          <button onClick={() => setCollapsed(c => !c)}
            className="ml-auto text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 shrink-0">
            {collapsed ? <Menu size={16}/> : <X size={16}/>}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visibleNav.map(group => {
            const isOpen    = openGroups.includes(group.label);
            const GroupIcon = group.icon;
            const groupActive = group.children.some(c => pathname === c.href || pathname.startsWith(c.href.split("?")[0]));
            return (
              <div key={group.label}>
                <button onClick={() => toggleGroup(group.label)}
                  className={cn("sidebar-item w-full", groupActive && "text-accent-600 bg-accent-50 dark:text-blue-400 dark:bg-blue-900/40")}>
                  <GroupIcon size={16} className="shrink-0"/>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{group.label}</span>
                      {isOpen ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
                    </>
                  )}
                </button>

                {isOpen && !collapsed && (
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-100 dark:border-gray-700 pl-2">
                    {group.children.map(item => {
                      const Icon = item.icon;
                      const active = pathname === item.href.split("?")[0] || pathname.startsWith(item.href.split("?")[0] + "/");
                      return (
                        <Link key={item.href} href={item.href}
                          className={cn("sidebar-item text-[13px]", active && "active")}>
                          <Icon size={14} className="shrink-0"/>
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-gray-100 dark:border-gray-700 px-2 py-2 space-y-0.5">
          {visibleBottom.map(item => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={cn("sidebar-item", pathname === item.href && "active")}>
                <Icon size={16} className="shrink-0"/>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          <button onClick={toggle} className="sidebar-item w-full">
            {theme === "dark"
              ? <Sun  size={16} className="shrink-0 text-amber-400"/>
              : <Moon size={16} className="shrink-0"/>}
            {!collapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
          </button>

          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-2 mt-1">
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                <span className="text-brand-700 font-semibold text-xs">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{userName}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                  {(sessionUser as any)?.role === "ADMIN" ? "🛡️ Admin" : (sessionUser as any)?.department ?? ""}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
