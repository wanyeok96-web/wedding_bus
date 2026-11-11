import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isClosed } from "./config";
import { normalizeName } from "./format";
import { legsOf, seatMapFrom, seatTaken } from "./rules";
import type { BookingInput, GroupType, Leg, PublicReservation, Reservation, SeatMap, Trip } from "./types";

export function usesSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return key.length > 20 && url.startsWith("https://");
}

export class SetupError extends Error {
  constructor() {
    super("setup");
    this.name = "SetupError";
  }
}

type Row = {
  id: string;
  seat_no: number;
  name: string;
  phone: string;
  trip: Trip;
  group_type: GroupType;
  note: string | null;
  created_at: string;
};

const filePath = path.join(process.cwd(), ".data", "reservations.json");
let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function fromRow(row: Row): Reservation {
  return {
    id: row.id,
    seatNo: row.seat_no,
    name: row.name,
    phone: row.phone,
    trip: row.trip,
    groupType: row.group_type,
    note: row.note ?? "",
    createdAt: row.created_at,
  };
}

function toPublic(reservation: Reservation): PublicReservation {
  return {
    id: reservation.id,
    seatNo: reservation.seatNo,
    name: reservation.name,
    trip: reservation.trip,
    groupType: reservation.groupType,
    note: reservation.note,
    createdAt: reservation.createdAt,
  };
}

let supabase: SupabaseClient | null = null;

function client() {
  if (!usesSupabase()) throw new SetupError();
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return supabase;
}

function raiseIfSetup(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  if (
    error.code === "42P01" ||
    error.code === "PGRST202" ||
    error.code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  ) {
    throw new SetupError();
  }
}

async function readFile(): Promise<Reservation[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as { reservations?: Reservation[] };
    return parsed.reservations ?? [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeFile(reservations: Reservation[]) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify({ reservations }, null, 2), "utf8");
}

async function listReservations(): Promise<Reservation[]> {
  if (!usesSupabase()) {
    if (process.env.NODE_ENV === "production") throw new SetupError();
    return readFile();
  }

  const { data, error } = await client()
    .from("reservations")
    .select("id, seat_no, name, phone, trip, group_type, note, created_at")
    .order("seat_no", { ascending: true });

  if (error) {
    raiseIfSetup(error);
    throw new Error(error.message);
  }
  return ((data ?? []) as Row[]).map(fromRow);
}

export async function getSeatMap(): Promise<SeatMap> {
  const reservations = await listReservations();
  return { ...seatMapFrom(reservations), closed: isClosed() };
}

export async function bookSeat(input: BookingInput): Promise<
  | { ok: true; reservation: PublicReservation; seats: SeatMap }
  | { ok: false; error: "taken" | "closed" | "invalid" }
> {
  if (!usesSupabase()) {
    if (process.env.NODE_ENV === "production") throw new SetupError();
    return withLock(async () => {
      if (isClosed()) return { ok: false as const, error: "closed" as const };
      const reservations = await readFile();
      if (seatTaken(reservations, input.seatNo, input.trip)) {
        return { ok: false as const, error: "taken" as const };
      }
      const reservation: Reservation = {
        id: randomUUID(),
        seatNo: input.seatNo,
        name: input.name,
        phone: input.phone,
        trip: input.trip,
        groupType: input.groupType,
        note: input.note,
        createdAt: new Date().toISOString(),
      };
      reservations.push(reservation);
      await writeFile(reservations);
      return {
        ok: true as const,
        reservation: toPublic(reservation),
        seats: { ...seatMapFrom(reservations), closed: false },
      };
    });
  }

  const { data, error } = await client().rpc("book_seat", {
    p_seat: input.seatNo,
    p_name: input.name,
    p_phone: input.phone,
    p_trip: input.trip,
    p_group: input.groupType,
    p_note: input.note,
  });

  if (error) {
    raiseIfSetup(error);
    throw new Error(error.message);
  }

  const result = data as { ok?: boolean; error?: string; id?: string } | null;
  if (!result?.ok) {
    const reason = result?.error === "taken" || result?.error === "closed" ? result.error : "invalid";
    return { ok: false, error: reason };
  }

  const reservation: PublicReservation = {
    id: result.id ?? randomUUID(),
    seatNo: input.seatNo,
    name: input.name,
    trip: input.trip,
    groupType: input.groupType,
    note: input.note,
    createdAt: new Date().toISOString(),
  };
  return { ok: true, reservation, seats: await getSeatMap() };
}

export async function lookupReservations(name: string, last4: string) {
  const key = normalizeName(name);
  const reservations = await listReservations();
  return reservations
    .filter((reservation) => normalizeName(reservation.name) === key && reservation.phone.endsWith(last4))
    .map(toPublic)
    .sort((a, b) => a.seatNo - b.seatNo || a.createdAt.localeCompare(b.createdAt));
}

export async function listForAdmin() {
  const reservations = await listReservations();
  const order = { outbound: 0, round: 1, inbound: 2 };
  return reservations.sort(
    (a, b) => a.seatNo - b.seatNo || order[a.trip] - order[b.trip] || a.createdAt.localeCompare(b.createdAt),
  );
}

export async function updateReservation(
  id: string,
  input: BookingInput,
): Promise<{ ok: true } | { ok: false; error: "taken" | "missing" }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "missing" };
  if (!usesSupabase()) {
    if (process.env.NODE_ENV === "production") throw new SetupError();
    return withLock(async () => {
      const reservations = await readFile();
      const index = reservations.findIndex((reservation) => reservation.id === id);
      if (index < 0) return { ok: false as const, error: "missing" as const };
      const others = reservations.filter((reservation) => reservation.id !== id);
      if (seatTaken(others, input.seatNo, input.trip)) return { ok: false as const, error: "taken" as const };
      reservations[index] = { ...reservations[index], ...input };
      await writeFile(reservations);
      return { ok: true as const };
    });
  }

  const db = client();
  const { data: current, error: findError } = await db.from("reservations").select("id").eq("id", id).maybeSingle();
  if (findError) {
    raiseIfSetup(findError);
    throw new Error(findError.message);
  }
  if (!current) return { ok: false, error: "missing" };

  const { data: heldRows, error: holdsError } = await db
    .from("seat_holds")
    .select("seat_no, leg")
    .eq("reservation_id", id);
  if (holdsError) throw new Error(holdsError.message);

  const held = (heldRows ?? []) as { seat_no: number; leg: Leg }[];
  const wanted = legsOf(input.trip);
  const toAdd = wanted.filter((leg) => !held.some((hold) => hold.seat_no === input.seatNo && hold.leg === leg));
  const toRemove = held.filter((hold) => hold.seat_no !== input.seatNo || !wanted.includes(hold.leg));

  if (toAdd.length > 0) {
    const { error: insertError } = await db
      .from("seat_holds")
      .insert(toAdd.map((leg) => ({ seat_no: input.seatNo, leg, reservation_id: id })));
    if (insertError) {
      if (insertError.code === "23505") return { ok: false, error: "taken" };
      throw new Error(insertError.message);
    }
  }

  const { error: updateError } = await db
    .from("reservations")
    .update({
      seat_no: input.seatNo,
      name: input.name,
      phone: input.phone,
      trip: input.trip,
      group_type: input.groupType,
      note: input.note,
    })
    .eq("id", id);
  if (updateError) {
    for (const leg of toAdd) {
      await db.from("seat_holds").delete().eq("reservation_id", id).eq("seat_no", input.seatNo).eq("leg", leg);
    }
    throw new Error(updateError.message);
  }

  for (const hold of toRemove) {
    await db.from("seat_holds").delete().eq("reservation_id", id).eq("seat_no", hold.seat_no).eq("leg", hold.leg);
  }
  return { ok: true };
}

export async function cancelReservation(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  if (!usesSupabase()) {
    if (process.env.NODE_ENV === "production") throw new SetupError();
    return withLock(async () => {
      const reservations = await readFile();
      const next = reservations.filter((reservation) => reservation.id !== id);
      if (next.length === reservations.length) return false;
      await writeFile(next);
      return true;
    });
  }

  const { data, error } = await client().from("reservations").delete().eq("id", id).select("id");
  if (error) {
    raiseIfSetup(error);
    throw new Error(error.message);
  }
  return (data ?? []).length > 0;
}
