"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

interface NavItem {
  href: string;
  labelKey: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: "dashboard" },
  { href: "/dashboard/lessons", labelKey: "library", icon: "local_library" },
  { href: "/dashboard/calendar", labelKey: "schedule", icon: "calendar_month" },
  { href: "/dashboard/reports", labelKey: "reports", icon: "bar_chart" },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("sidebar");

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="sidebar">
      <div className="flex flex-col gap-8">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <span className="material-symbols-outlined text-2xl">
              center_focus_strong
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-white text-base font-bold leading-tight tracking-tight">
              Classroom
            </span>
            <span className="text-[var(--color-primary)] text-base font-bold leading-tight tracking-tight">
              Focus Tracker
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive(item.href)
                  ? "sidebar-nav-item-active"
                  : "sidebar-nav-item"
              }
            >
              <span
                className={`material-symbols-outlined sidebar-nav-icon ${
                  isActive(item.href) ? "filled" : ""
                }`}
              >
                {item.icon}
              </span>
              <span
                className={
                  isActive(item.href)
                    ? "sidebar-nav-label-active"
                    : "sidebar-nav-label"
                }
              >
                {t(item.labelKey)}
              </span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="px-4 py-2">
        <p className="text-[10px] text-[var(--text-muted)] opacity-50 uppercase tracking-widest">
          Version 2.0.0
        </p>
      </div>
    </aside>
  );
}
