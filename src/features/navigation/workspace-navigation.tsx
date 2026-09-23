"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

type NavigationItem = {
  href: string;
  label: string;
  mobileLabel?: string;
};

const primaryItems: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", mobileLabel: "Home" },
  { href: "/equipment", label: "Equipment" },
  { href: "/faults", label: "Faults" },
  { href: "/notifications", label: "Notifications" },
];

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function WorkspaceNavigation({ isManager }: { isManager: boolean }) {
  const pathname = usePathname();
  const items = isManager ? [...primaryItems, { href: "/staff", label: "Staff" }] : primaryItems;

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="workspace-nav">
        <Link className="workspace-nav__brand" href="/dashboard">
          FitFix
        </Link>
        <nav aria-label="Workspace navigation" className="workspace-nav__links">
          {items.map((item) => {
            const current = isCurrentPath(pathname, item.href);
            return (
              <Link
                aria-current={current ? "page" : undefined}
                className={
                  current
                    ? "workspace-nav__link workspace-nav__link--active"
                    : "workspace-nav__link"
                }
                href={item.href}
                key={item.href}
              >
                <span className="workspace-nav__desktop-label">{item.label}</span>
                <span className="workspace-nav__mobile-label">
                  {item.mobileLabel ?? item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="workspace-nav__account">
          <Link className="button button--accent workspace-nav__report" href="/faults/new">
            Report fault
          </Link>
          <UserButton />
        </div>
      </header>
      <nav aria-label="Mobile workspace navigation" className="workspace-nav__mobile-bar">
        {[
          { href: "/dashboard", label: "Home", icon: "⌂" },
          { href: "/equipment", label: "Equipment", icon: "▦" },
          { href: "/faults/new", label: "Report", icon: "+" },
          { href: "/faults", label: "Faults", icon: "!" },
          { href: isManager ? "/staff" : "/notifications", label: "More", icon: "•" },
        ].map((item) => {
          const current = isCurrentPath(pathname, item.href);
          return (
            <Link
              aria-current={current ? "page" : undefined}
              className={
                current
                  ? "workspace-nav__mobile-link workspace-nav__mobile-link--active"
                  : "workspace-nav__mobile-link"
              }
              href={item.href}
              key={item.href}
            >
              <span aria-hidden="true" className="workspace-nav__mobile-icon">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
