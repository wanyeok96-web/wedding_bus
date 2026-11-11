import { cancelByGuest, SetupError } from "@/lib/db";
import { displayName, normalizePhone } from "@/lib/format";
import { clientIp, json } from "@/lib/http";
import { isRateLimited } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (isRateLimited(`cancel:${clientIp(request)}`, 10, 10 * 60 * 1000)) {
    return json({ ok: false, error: "rate" }, 429);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid" }, 400);
  }

  const id = typeof body.id === "string" ? body.id : "";
  const name = displayName(typeof body.name === "string" ? body.name : "");
  const phone = normalizePhone(typeof body.phone === "string" ? body.phone : "");
  if (!id || !name || !/^01[016789]\d{7,8}$/.test(phone)) return json({ ok: false, error: "invalid" }, 400);

  try {
    const result = await cancelByGuest(id, name, phone);
    return json(result, result.ok ? 200 : 403);
  } catch (error) {
    if (error instanceof SetupError) return json({ ok: false, error: "setup" }, 503);
    console.error("guest cancel failed");
    return json({ ok: false, error: "server" }, 500);
  }
}
