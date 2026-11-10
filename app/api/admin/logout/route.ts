import { adminCookie } from "@/lib/admin";
import { json } from "@/lib/http";

export const runtime = "nodejs";

export async function POST() {
  const response = json({ ok: true });
  response.headers.set("Set-Cookie", adminCookie("", 0));
  return response;
}
