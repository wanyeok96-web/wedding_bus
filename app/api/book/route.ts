import { bookSeat, SetupError } from "@/lib/db";
import { clientIp, json } from "@/lib/http";
import { isRateLimited } from "@/lib/rate-limit";
import { validateBooking } from "@/lib/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (isRateLimited(`book:${clientIp(request)}`, 15, 10 * 60 * 1000)) {
    return json({ ok: false, error: "rate" }, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid" }, 400);
  }

  const parsed = validateBooking(body);
  if (!parsed.ok) return json({ ok: false, error: "invalid" }, 400);

  try {
    const result = await bookSeat(parsed.value);
    if (!result.ok) {
      const status = result.error === "taken" ? 409 : result.error === "closed" ? 403 : 400;
      return json(result, status);
    }
    return json(result);
  } catch (error) {
    if (error instanceof SetupError) return json({ ok: false, error: "setup" }, 503);
    console.error("book failed");
    return json({ ok: false, error: "server" }, 500);
  }
}
