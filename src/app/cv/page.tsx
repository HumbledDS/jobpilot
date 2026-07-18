import { requireUser } from "@/lib/guard";
import { PageHeader } from "@/components/ui";
import { CvProfiles } from "@/components/CvProfiles";

export const dynamic = "force-dynamic";

export default async function CvPage() {
  await requireUser();

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="CV · Positionnements"
        subtitle="Un même parcours raconté sous plusieurs angles métier. Chaque version est optimisée ATS : titre, résumé, expériences réécrites, compétences et mots-clés adaptés au secteur."
      />
      <CvProfiles />
    </div>
  );
}
