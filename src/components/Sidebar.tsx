"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandMark } from "@/components/BrandMark";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/stats", label: "Stats" },
  { href: "/applications", label: "Candidatures" },
  { href: "/jobs", label: "Offres" },
  { href: "/marche", label: "Marché" },
  { href: "/companies", label: "Entreprises" },
  { href: "/contacts", label: "Contacts" },
  { href: "/documents", label: "Documents" },
  { href: "/contenu", label: "Contenu" },
  { href: "/projects", label: "Projets" },
  { href: "/systeme", label: "Système" },
];

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark className="h-7 w-7 shrink-0 text-accent" />
      <div>
        <div className="text-[15px] font-semibold tracking-tight text-ink">JobPilot</div>
        <div className="eyebrow mt-1">Career OS · v1</div>
      </div>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {NAV.map((item, i) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-ink font-medium text-surface"
                : "font-medium text-muted hover:bg-canvas hover:text-ink"
            }`}
          >
            <span
              className={`mono text-[10px] ${active ? "text-surface/55" : "text-faint group-hover:text-muted"}`}
            >
              {String(i).padStart(2, "0")}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ onNavigate, email }: { onNavigate?: () => void; email?: string | null }) {
  return (
    <>
      <div className="px-5 py-5">
        <Wordmark />
      </div>
      <NavLinks onNavigate={onNavigate} />
      <div className="mt-2 space-y-3 border-t border-line px-5 py-4">
        <ThemeToggle />
        <div>
          <div className="eyebrow">Operator</div>
          <div className="mt-1.5 truncate text-xs font-medium text-ink">Babacar Gueye</div>
          <div className="mono mt-0.5 truncate text-[11px] text-faint">{email ?? "data · cloud · ia"}</div>
          <form action="/auth/signout" method="post" className="mt-2">
            <button className="text-[11px] font-medium text-muted hover:text-ink">Se déconnecter</button>
          </form>
        </div>
      </div>
    </>
  );
}

export function Sidebar({ email }: { email?: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer on route change as a safety net.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <SidebarBody email={email} />
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur md:hidden">
        <Wordmark />
        <button
          type="button"
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="btn-ghost"
        >
          <span className="flex flex-col gap-[3px]" aria-hidden="true">
            <span className="block h-0.5 w-4 rounded bg-ink" />
            <span className="block h-0.5 w-4 rounded bg-ink" />
            <span className="block h-0.5 w-4 rounded bg-ink" />
          </span>
          Menu
        </button>
      </header>

      {/* Mobile drawer + backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[80%] flex-col border-r border-line bg-surface shadow-xl">
            <div className="flex items-center justify-end px-3 pt-3">
              <button
                type="button"
                aria-label="Fermer le menu"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm font-medium text-muted hover:bg-canvas"
              >
                Fermer
              </button>
            </div>
            <SidebarBody onNavigate={() => setOpen(false)} email={email} />
          </aside>
        </div>
      )}
    </>
  );
}
