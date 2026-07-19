"use client";

export function PrintButton({ label = "Télécharger en PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary">
      {label}
    </button>
  );
}
