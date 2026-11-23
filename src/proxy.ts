import { NextResponse, type NextRequest } from "next/server";
import { checkAccess } from "@/data/access-gate";

// Avant toute page ou action : le mot de passe facultatif de la démo (voir src/data/access-gate.ts).
// Le proxy ne fait que traduire la réponse du verrou en code HTTP.
export function proxy(request: NextRequest) {
  if (checkAccess(request.headers.get("authorization"))) return NextResponse.next();
  return new NextResponse("Mot de passe requis.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="CRM-BTP", charset="UTF-8"' },
  });
}

// Tout sauf le webhook (lot 5, protégé par sa signature) et les fichiers de Next.
// Revue #12 : chaque exclusion s'arrête à un « / » ou à la fin, pour que /api/webhooks-admin reste protégé.
export const config = {
  matcher: ["/((?!api/webhooks(?:/|$)|_next/static/|_next/image(?:/|$)|favicon\\.ico$).*)"],
};
