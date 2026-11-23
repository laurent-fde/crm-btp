import Link from "next/link";
import type { Lead } from "@/services/ports";
import { Card, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";

// Une carte du tableau : le nom, puis entreprise · métier · code postal et ville (seulement ce qui est rempli).
// Un clic ouvre la fiche (?lead=<id>), sans remonter en haut de la page.
export function LeadCard({ lead }: { lead: Lead }) {
  const place = [lead.postalCode, lead.city].filter(Boolean).join(" ");
  const details = [lead.company, lead.trade, place].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/?lead=${encodeURIComponent(lead.id)}`}
      scroll={false}
      className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card size="sm" className="shadow-xs transition-colors hover:bg-muted/50">
        <CardHeader>
          <CardTitle className="font-sans font-semibold">{lead.name}</CardTitle>
          {details && <CardDescription className="text-xs">{details}</CardDescription>}
        </CardHeader>
      </Card>
    </Link>
  );
}
