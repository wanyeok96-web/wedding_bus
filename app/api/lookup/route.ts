import { lookupReservations, SetupError } from "@/lib/db";
import { clientIp, json } from "@/lib/http";
import { isRateLimited } from "@/lib/rate-limit";
import { validateLookup } from "@/lib/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (isRateLimited(`lookup:${clientIp(request)}`, 20, 10 * 60 * 1000)) {
    return json({ error: "rate" }, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid" }, 400);
  }

  const parsed = validateLookup(body);
  if (!parsed.ok) return json({ error: "invalid" }, 400);

  try {
    const reservations = await lookupReservations(parsed.name, parsed.last4);
    return json({ reservations });
  } catch (error) {
    if (error instanceof SetupError) return json({ error: "setup" }, 503);
    console.error("lookup failed");
    return json({ error: "server" }, 500);
  }
}
