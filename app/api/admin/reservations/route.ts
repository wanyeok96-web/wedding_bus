import { isAdminRequest } from "@/lib/admin";
import { cancelReservation, listForAdmin, SetupError } from "@/lib/db";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return json({ error: "auth" }, 401);
  try {
    return json({ reservations: await listForAdmin() });
  } catch (error) {
    if (error instanceof SetupError) return json({ error: "setup" }, 503);
    console.error("admin list failed");
    return json({ error: "server" }, 500);
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) return json({ error: "auth" }, 401);
  let id = "";
  try {
    const body = (await request.json()) as { id?: unknown };
    id = typeof body.id === "string" ? body.id : "";
  } catch {
    return json({ ok: false }, 400);
  }
  try {
    const removed = await cancelReservation(id);
    return json({ ok: removed, reservations: await listForAdmin() });
  } catch (error) {
    if (error instanceof SetupError) return json({ error: "setup" }, 503);
    console.error("admin cancel failed");
    return json({ error: "server" }, 500);
  }
}
