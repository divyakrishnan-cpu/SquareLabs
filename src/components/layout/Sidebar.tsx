"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, BarChart2, Calendar, FileText, Send,
  Bot, Users, Target, Megaphone, Star, Settings,
  ChevronDown, ChevronRight, Briefcase, TrendingUp,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: NavItem[];
  badge?: string;
}

const nav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Social Media", icon: TrendingUp,
    children: [
      { label: "Performance",    href: "/dashboard/social/performance", icon: BarChart2 },
      { label: "Content Planner",href: "/dashboard/social/planner",     icon: Bot },
      { label: "Script Creator", href: "/dashboard/social/scripts",     icon: FileText },
      { label: "Calendar & Publish",href:"/dashboard/social/calendar",  icon: Calendar, badge:"Live" },
      { label: "Notifications",  href: "/dashboard/social/notifications",icon: Send },
    ],
  },
  {
    label: "Tasks", icon: Briefcase,
    children: [
      { label: "All Tasks",   href: "/dashboard/tasks",       icon: Briefcase },
      { label: "My Tasks",    href: "/dashboard/tasks/mine",  icon: Users },
    ],
  },
  { label: "KPIs",         href: "/dashboard/kpis",        icon: Target },
  { label: "ORM",          href: "/dashboard/orm",         icon: Star },
  { label: "Paid Campaigns",href: "/dashboard/paid",       icon: Megaphone },
  { label: "HR & Budget",  href: "/dashboard/hr",          icon: Users, badge: "Private" },
  { label: "Settings",     href: "/dashboard/settings",    icon: Settings },
];

function NavGroup({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const isActive = item.href ? pathname.startsWith(item.href) : false;
  const hasChildren = !!item.children?.length;
  const anyChildActive = item.children?.some((c) => c.href && pathname.startsWith(c.href));
  const [open, setOpen] = useState(anyChildActive ?? false);

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "sidebar-item w-full justify-between",
            anyChildActive && "text-gray-900 font-semibold"
          )}
        >
          <span className="flex items-center gap-2.5">
            <item.icon size={16} />
            <span>{item.label}</span>
          </span>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {open && (
          <div className="ml-3 mt-0.5 border-l border-gray-200 pl-3 space-y-0.5">
            {item.children!.map((child) => (
              <NavGroup key={child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        "sidebar-item",
        isActive && "active"
      )}
    >
      <item.icon size={16} className="shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span className={cn(
          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
          item.badge === "Live"    ? "bg-green-100 text-green-700" :
          item.badge === "Private"? "bg-red-100   text-red-600"   :
          "bg-gray-100 text-gray-500"
        )}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-200 flex flex-col z-30">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand-500 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none">SquareLabs</p>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">Marketing Intelligence</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {nav.map((item) => (
          <NavGroup key={item.label} item={item} />
        ))}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 border-t border-gray-200 pt-3">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            DK
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">Divya Krishnan</p>
            <p className="text-[10px] text-gray-400 truncate">Head of Marketing</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
