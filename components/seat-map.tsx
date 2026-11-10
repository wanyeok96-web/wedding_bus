import { SEAT_ROWS, TRIP_LABEL } from "@/lib/config";
import type { SeatMap, Trip } from "@/lib/types";

type SeatState = "open" | "taken" | "partial" | "selected" | "highlight";

function stateFor(seatNo: number, trip: Trip, holds: SeatMap, selected: number | null): SeatState {
  if (selected === seatNo) return "selected";
  const outbound = holds.outbound.includes(seatNo);
  const inbound = holds.inbound.includes(seatNo);
  if (trip === "round") return outbound || inbound ? "taken" : "open";
  if (trip === "outbound") {
    if (outbound) return "taken";
    if (inbound) return "partial";
    return "open";
  }
  if (inbound) return "taken";
  if (outbound) return "partial";
  return "open";
}

function labelFor(seatNo: number, state: SeatState) {
  if (state === "taken") return `${seatNo}번 좌석, 예약됨`;
  if (state === "partial") return `${seatNo}번 좌석, 다른 편만 예약됨, 선택 가능`;
  if (state === "selected") return `${seatNo}번 좌석, 선택됨`;
  return `${seatNo}번 좌석, 비어 있음`;
}

export function SeatMap({
  holds,
  trip,
  selected,
  closed,
  onSelect,
  highlights,
  compact = false,
}: {
  holds: SeatMap;
  trip: Trip;
  selected: number | null;
  closed: boolean;
  onSelect?: (seatNo: number) => void;
  highlights?: number[];
  compact?: boolean;
}) {
  return (
    <div className={compact ? "bus compact" : "bus"} aria-label="27인승 버스 좌석">
      <div className="cab">
        <span>운전석</span>
        <span>출입문</span>
      </div>
      <div className="rows">
        {SEAT_ROWS.map((row) => (
          <div className="row" key={row[0]}>
            {row.map((seatNo, index) => {
              const highlighted = highlights?.includes(seatNo) ?? false;
              const state: SeatState = highlights ? (highlighted ? "highlight" : "open") : stateFor(seatNo, trip, holds, selected);
              const className = `seat ${state === "open" ? "" : state}`.trim();
              const place = index === 2 ? ({ gridColumn: "4" } as const) : undefined;
              if (highlights || !onSelect) {
                return (
                  <div className={className} key={seatNo} style={place} aria-label={highlighted ? `${seatNo}번 내 좌석` : `${seatNo}번`}>
                    <span>{seatNo}</span>
                  </div>
                );
              }
              const blocked = closed || state === "taken";
              return (
                <button
                  key={seatNo}
                  type="button"
                  className={className}
                  style={place}
                  aria-label={labelFor(seatNo, state)}
                  aria-pressed={state === "selected"}
                  disabled={blocked}
                  onClick={() => onSelect(seatNo)}
                >
                  <span>{seatNo}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {!compact && (
        <p className="fine" style={{ margin: "8px 0 0", textAlign: "center" }}>
          앞쪽 기준 · {TRIP_LABEL[trip]} · 왼쪽 두 자리, 오른쪽 한 자리
        </p>
      )}
    </div>
  );
}
