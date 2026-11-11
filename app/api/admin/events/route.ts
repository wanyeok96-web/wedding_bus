import { isAdminRequest } from "@/lib/admin";
import { listEvents, SetupError } from "@/lib/db";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return json({ error: "auth" }, 401);
  try {
    return json(await listEvents());
  } catch (error) {
    if (error instanceof SetupError) return json({ error: "setup" }, 503);
    console.error("admin events failed");
    return json({ error: "server" }, 500);
  }
}
