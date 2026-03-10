"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart2, FileText, MessageSquare, CalendarDays,
  PenTool, Settings, ChevronDown, ChevronRight,
  Share2, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  {
    label: "Social",
    icon: Share2,
    children: [
      { label: "Dashboard",          href: "/social/dashboard", icon: BarChart2 },
      { label: "Content Calendar",   href: "/social/calendar",  icon: CalendarDays },
      { label: "ORM",                href: "/social/orm",       icon: MessageSquare },
    ],
  },
];

const BOTTOM_NAV = [
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(["Social"]);

  function toggleGroup(label: string) {
    setOpenGroups(prev =>
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    );
  }

  return (
    <>
      {/* Mobile overlay */}
      <div className={cn("fixed inset-0 bg-black/40 z-20 lg:hidden", collapsed ? "hidden" : "block")}
        onClick={() => setCollapsed(true)} />

      <aside className={cn(
        "fixed top-0 left-0 h-full bg-white border-r border-gray-200 flex flex-col z-30 transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-gray-100 shrink-0">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">SY</span>
          </div>
          {!collapsed && (
            <span className="font-semibold text-gray-900 text-sm truncate">SquareLabs</span>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="ml-auto text-gray-400 hover:text-gray-600 shrink-0"
          >
            {collapsed ? <Menu size={16} /> : <X size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map(group => {
            const isOpen = openGroups.includes(group.label);
            const GroupIcon = group.icon;
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    "sidebar-item w-full",
                    group.children.some(c => pathname.startsWith(c.href)) && "text-accent-600 bg-accent-50"
                  )}
                >
                  <GroupIcon size={16} className="shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{group.label}</span>
                      {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </>
                  )}
                </button>

                {isOpen && !collapsed && (
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-100 pl-2">
                    {group.children.map(item => {
                      const Icon = item.icon;
                      const active = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link key={item.href} href={item.href}
                          className={cn("sidebar-item text-[13px]", active && "active")}
                        >
                          <Icon size={14} className="shrink-0" />
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
        <div className="border-t border-gray-100 px-2 py-2 space-y-0.5">
          {BOTTOM_NAV.map(item => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={cn("sidebar-item", active && "active")}
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {/* User */}
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-2 mt-1">
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                <span className="text-brand-700 font-semibold text-xs">DK</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">Divya Krishnan</p>
                <p className="text-[10px] text-gray-500 truncate">Head of Marketing</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Spacer */}
      <div className={cn("shrink-0 transition-all duration-200", collapsed ? "w-16" : "w-56")} />
    </>
  );
}
