import { GROUPS, SEAT_COUNT, TRIPS } from "./config";
import { displayName, normalizePhone } from "./format";
import type { BookingInput, GroupType, Trip } from "./types";

const phonePattern = /^01[016789]\d{7,8}$/;

function isTrip(value: unknown): value is Trip {
  return typeof value === "string" && TRIPS.includes(value as Trip);
}

function isGroup(value: unknown): value is GroupType {
  return typeof value === "string" && GROUPS.includes(value as GroupType);
}

export function validateBooking(body: unknown):
  | { ok: true; value: BookingInput }
  | { ok: false; error: "invalid" } {
  if (!body || typeof body !== "object") return { ok: false, error: "invalid" };
  const record = body as Record<string, unknown>;
  if (typeof record.website === "string" && record.website.trim()) {
    return { ok: false, error: "invalid" };
  }

  const seatNo = Number(record.seatNo);
  const name = displayName(typeof record.name === "string" ? record.name : "");
  const phone = normalizePhone(typeof record.phone === "string" ? record.phone : "");
  const note = (typeof record.note === "string" ? record.note : "").trim();

  if (!Number.isInteger(seatNo) || seatNo < 1 || seatNo > SEAT_COUNT) {
    return { ok: false, error: "invalid" };
  }
  if (name.length < 1 || name.length > 40) return { ok: false, error: "invalid" };
  if (!phonePattern.test(phone)) return { ok: false, error: "invalid" };
  if (!isTrip(record.trip) || !isGroup(record.groupType)) return { ok: false, error: "invalid" };
  if (note.length > 200) return { ok: false, error: "invalid" };

  return {
    ok: true,
    value: { seatNo, name, phone, trip: record.trip, groupType: record.groupType, note },
  };
}

export function validateLookup(body: unknown):
  | { ok: true; name: string; last4: string }
  | { ok: false } {
  if (!body || typeof body !== "object") return { ok: false };
  const record = body as Record<string, unknown>;
  const name = displayName(typeof record.name === "string" ? record.name : "");
  const digits = normalizePhone(typeof record.last4 === "string" ? record.last4 : "");
  const last4 = digits.length > 4 ? digits.slice(-4) : digits;
  if (name.length < 1 || name.length > 40 || !/^\d{4}$/.test(last4)) return { ok: false };
  return { ok: true, name, last4 };
}
