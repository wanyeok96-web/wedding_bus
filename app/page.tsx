import { BusApp } from "@/components/bus-app";
import { getSeatMap, SetupError, usesSupabase } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page() {
  try {
    const seats = await getSeatMap();
    return <BusApp initial={seats} localPreview={!usesSupabase()} />;
  } catch (error) {
    if (error instanceof SetupError) {
      return (
        <main className="wrap">
          <p className="eyebrow">WEDDING BUS</p>
          <h1>저장소 연결이 필요합니다</h1>
          <p>
            Supabase SQL Editor에서 supabase/schema.sql을 실행하고, 서버 환경 변수에
            SUPABASE_SERVICE_ROLE_KEY와 ADMIN_PASSWORD를 넣어 주세요.
          </p>
        </main>
      );
    }
    throw error;
  }
}
