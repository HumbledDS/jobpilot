import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(20,22,25,0.04)] sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="min-w-0">
      <div className="eyebrow truncate">{label}</div>
      <div className="mono tnum mt-2.5 text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-faint">{hint}</div>}
    </Card>
  );
}

export function SetupBanner() {
  return (
    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <strong>Configuration requise</strong> · ajoute{" "}
      <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
      dans <code className="rounded bg-amber-100 px-1">.env.local</code> et sur
      Vercel (Settings / Environment Variables) pour activer la lecture/écriture
      des données. Clé : Supabase / Project Settings / API / service_role.
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-canvas px-6 py-10 text-center text-sm text-faint">
      {children}
    </div>
  );
}

export function fmtSalary(min: number | null, max: number | null) {
  if (!min && !max) return null;
  const k = (n: number) => `${Math.round(n / 1000)}k`;
  if (min && max) return `${k(min)}–${k(max)}€`;
  return `${k((min ?? max)!)}€`;
}

export const SOURCE_LABELS: Record<string, string> = {
  apec: "APEC",
  france_travail: "France Travail",
  adzuna: "Adzuna",
  manual: "Manuel",
  targets: "Entreprise cible",
};

/** Days since a date (0 = today). null if no date. */
export function ageInDays(date: string | null): number | null {
  if (!date) return null;
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / 86400000);
}

export function timeAgo(date: string | null): string {
  if (!date) return "date inconnue";
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 60) return `il y a ${Math.max(mins, 0)} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "hier";
  if (d < 30) return `il y a ${d} j`;
  const mo = Math.floor(d / 30);
  return `il y a ${mo} mois`;
}

/** Freshness badge: the fresher the posting, the stronger the signal to apply now. */
export function Freshness({ postedAt }: { postedAt: string | null }) {
  const d = ageInDays(postedAt);
  let cls = "bg-subtle text-muted border-line";
  let label = timeAgo(postedAt);
  if (d !== null) {
    if (d <= 0) {
      cls = "bg-emerald-100 text-emerald-700 border-emerald-200";
      label = "Aujourd'hui";
    } else if (d <= 2) {
      cls = "bg-lime-100 text-lime-700 border-lime-200";
    } else if (d <= 7) {
      cls = "bg-amber-100 text-amber-700 border-amber-200";
    } else if (d <= 21) {
      cls = "bg-orange-100 text-orange-700 border-orange-200";
    } else {
      cls = "bg-rose-100 text-rose-600 border-rose-200";
    }
  }
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}
