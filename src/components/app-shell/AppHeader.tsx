"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "./nav";
import { CalendarDays, Bell, Settings, UserCircle } from "lucide-react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="tp-header">
      <div className="tp-container tp-container-pad">
        <div className="tp-header__inner">
          <div className="tp-brand">
            <Link href="/dashboard" className="tp-brand__link" aria-label="TalentPilot AI">
              <span className="tp-brand__logo">TP</span>
              <span className="tp-brand__text">
                <span className="tp-brand__name">TalentPilot AI</span>
                <span className="tp-brand__tagline">Recruiting OS • Québec/Canada</span>
              </span>
            </Link>
          </div>

          <div className="tp-actions">
            <div className="tp-search">
              <input className="tp-search__input" placeholder="Rechercher…" aria-label="Rechercher" />
            </div>

            <div className="tp-action-icons" aria-label="Actions">
              <button className="tp-icon-btn" aria-label="Calendrier" type="button">
                <CalendarDays size={18} />
              </button>
              <button className="tp-icon-btn" aria-label="Notifications" type="button">
                <Bell size={18} />
              </button>
              <button className="tp-icon-btn" aria-label="Paramètres" type="button">
                <Settings size={18} />
              </button>
              <button className="tp-avatar" aria-label="Profil" type="button">
                <UserCircle size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <nav className="tp-sections" aria-label="Navigation principale">
        <div className="tp-container tp-container-pad" style={{ paddingTop: 0 }}>
          <div className="tp-sections__inner">
            {PRIMARY_NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("tp-section", active && "tp-section--active")}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </header>
  );
}