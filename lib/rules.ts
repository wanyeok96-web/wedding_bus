import type { Leg, Reservation, Trip } from "./types";

export function legsOf(trip: Trip): Leg[] {
  if (trip === "round") return ["outbound", "inbound"];
  return [trip];
}

export function seatMapFrom(reservations: Pick<Reservation, "seatNo" | "trip">[]) {
  const outbound = new Set<number>();
  const inbound = new Set<number>();
  for (const reservation of reservations) {
    for (const leg of legsOf(reservation.trip)) {
      (leg === "outbound" ? outbound : inbound).add(reservation.seatNo);
    }
  }
  return {
    outbound: [...outbound].sort((a, b) => a - b),
    inbound: [...inbound].sort((a, b) => a - b),
  };
}

export function seatTaken(
  reservations: Pick<Reservation, "seatNo" | "trip">[],
  seatNo: number,
  trip: Trip,
) {
  const need = new Set(legsOf(trip));
  return reservations.some(
    (reservation) =>
      reservation.seatNo === seatNo && legsOf(reservation.trip).some((leg) => need.has(leg)),
  );
}
