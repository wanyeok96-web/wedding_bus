import { adminCookie, adminToken, safeEqual } from "@/lib/admin";
import { clientIp, json } from "@/lib/http";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (isRateLimited(`admin:${clientIp(request)}`, 8, 10 * 60 * 1000)) {
    return json({ ok: false, error: "rate" }, 429);
  }
  const token = adminToken();
  if (!token || !process.env.ADMIN_PASSWORD) return json({ ok: false, error: "setup" }, 503);

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return json({ ok: false, error: "invalid" }, 400);
  }

  if (!safeEqual(password, process.env.ADMIN_PASSWORD)) {
    return json({ ok: false, error: "invalid" }, 401);
  }

  const response = json({ ok: true });
  response.headers.set("Set-Cookie", adminCookie(token, 60 * 60 * 12));
  return response;
}
