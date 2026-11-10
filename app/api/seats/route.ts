import { getSeatMap, SetupError } from "@/lib/db";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return json(await getSeatMap());
  } catch (error) {
    if (error instanceof SetupError) return json({ error: "setup" }, 503);
    console.error("seats failed");
    return json({ error: "server" }, 500);
  }
}
