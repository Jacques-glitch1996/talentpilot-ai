"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/candidates", label: "Candidats" },
  { href: "/job-posts", label: "Offres" },
  { href: "/interviews", label: "Entrevues" },
  { href: "/documents", label: "Documents" },
  { href: "/performance", label: "Performance" },
  { href: "/messages", label: "Messages" },
  { href: "/history", label: "Historique" },
  { href: "/ai", label: "IA" },
];

export default function SectionNav() {
  const pathname = usePathname();

  return (
    <div className="w-full border-b border-black/5 bg-white/40 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 overflow-x-auto py-3 hide-scrollbar">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "whitespace-nowrap rounded-full px-4 py-2 text-sm transition",
                  active
                    ? "bg-white/70 border border-white/60 shadow-sm"
                    : "bg-white/30 hover:bg-white/50 border border-white/40",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}