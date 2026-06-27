// Accès restreint aux comptes autorisés (outil personnel — données privées).
// Surcharge possible via la variable d'env ALLOWED_EMAILS (séparés par des virgules).
export const ALLOWED_EMAILS = (
  process.env.ALLOWED_EMAILS ??
  "gueyebaba159@gmail.com,babacar.work2024@gmail.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAllowed(email?: string | null): boolean {
  return !!email && ALLOWED_EMAILS.includes(email.toLowerCase());
}
