import type { Lead } from "@/services/ports";
import { Card, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";

// Une carte du tableau : le nom, puis entreprise · métier · code postal et ville (seulement ce qui est rempli).
export function LeadCard({ lead }: { lead: Lead }) {
  const place = [lead.postalCode, lead.city].filter(Boolean).join(" ");
  const details = [lead.company, lead.trade, place].filter(Boolean).join(" · ");

  return (
    <Card size="sm" className="shadow-xs">
      <CardHeader>
        <CardTitle className="font-sans font-semibold">{lead.name}</CardTitle>
        {details && <CardDescription className="text-xs">{details}</CardDescription>}
      </CardHeader>
    </Card>
  );
}
