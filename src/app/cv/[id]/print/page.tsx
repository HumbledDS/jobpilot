import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { CV_PROFILES } from "@/lib/cvProfiles";
import { CvDocument } from "@/components/CvDocument";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function CvPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const profile = CV_PROFILES.find((p) => p.id === id);
  if (!profile) notFound();

  return (
    <div>
      {/* Barre d'action — masquée à l'impression */}
      <div className="no-print mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/cv" className="btn-ghost w-fit">
          ← Retour aux positionnements
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted sm:block">
            Boîte d&apos;impression → Destination : « Enregistrer en PDF ».
          </span>
          <PrintButton />
        </div>
      </div>

      <CvDocument profile={profile} />
    </div>
  );
}
