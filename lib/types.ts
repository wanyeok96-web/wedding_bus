import type { GROUPS, TRIPS } from "./config";

export type Trip = (typeof TRIPS)[number];
export type GroupType = (typeof GROUPS)[number];
export type Leg = "outbound" | "inbound";

export type Reservation = {
  id: string;
  seatNo: number;
  name: string;
  phone: string;
  trip: Trip;
  groupType: GroupType;
  note: string;
  createdAt: string;
};

export type PublicReservation = Omit<Reservation, "phone">;

export type SeatMap = {
  outbound: number[];
  inbound: number[];
  closed: boolean;
};

export type BookingInput = {
  seatNo: number;
  name: string;
  phone: string;
  trip: Trip;
  groupType: GroupType;
  note: string;
};
