import { EVENT, GROUP_LABEL, SEAT_ROWS, SEAT_COUNT, TRIP_LABEL } from "@/lib/config";
import { formatPhone } from "@/lib/format";
import { legsOf } from "@/lib/rules";
import type { Leg, Reservation } from "@/lib/types";

export type PrintMode = "all" | "seats" | "roster";

const LEG_TITLE: Record<Leg, string> = {
  outbound: `가는 편 · 12월 5일(토) ${EVENT.departAt} · ${EVENT.fromName} 정문 출발`,
  inbound: `오는 편 · 12월 5일(토) ${EVENT.returnAt} · ${EVENT.toName} 출발`,
};

function seatsFor(rows: Reservation[], leg: Leg) {
  const map = new Map<number, Reservation>();
  for (const row of rows) {
    if (legsOf(row.trip).includes(leg)) map.set(row.seatNo, row);
  }
  return map;
}

function LegSeatMap({ rows, leg }: { rows: Reservation[]; leg: Leg }) {
  const seats = seatsFor(rows, leg);
  return (
    <section className="print-leg">
      <h3>{LEG_TITLE[leg]}</h3>
      <p className="print-meta">탑승 {seats.size} / {SEAT_COUNT}석</p>
      <div className="print-bus">
        <div className="print-cab">
          <span>운전석</span>
          <span>출입문</span>
        </div>
        {SEAT_ROWS.map((row) => (
          <div className="print-row" key={row[0]}>
            {row.map((seatNo, index) => {
              const person = seats.get(seatNo);
              return (
                <div
                  className={person ? "print-seat filled" : "print-seat"}
                  key={seatNo}
                  style={index === 2 ? { gridColumn: "4" } : undefined}
                >
                  <span className="print-no">{seatNo}</span>
                  <span className="print-name">{person?.name ?? ""}</span>
                  <span className="print-group">{person ? GROUP_LABEL[person.groupType] : ""}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

export function PrintSheet({ rows, mode, printedAt }: { rows: Reservation[]; mode: PrintMode; printedAt: string }) {
  const sorted = [...rows].sort((a, b) => a.seatNo - b.seatNo || a.createdAt.localeCompare(b.createdAt));
  const showSeats = mode !== "roster";
  const showRoster = mode !== "seats";

  return (
    <div className="print-area" aria-hidden="true">
      {showSeats ? (
        <section className={showRoster ? "print-page print-break" : "print-page"}>
          <header className="print-head">
            <div>
              <p className="print-eyebrow">WEDDING BUS · 2026.12.05</p>
              <h2>버스 좌석표</h2>
            </div>
            <p className="print-meta">출력 {printedAt}</p>
          </header>
          <div className="print-legs">
            <LegSeatMap rows={rows} leg="outbound" />
            <LegSeatMap rows={rows} leg="inbound" />
          </div>
        </section>
      ) : null}

      {showRoster ? (
        <section className="print-page">
          <header className="print-head">
            <div>
              <p className="print-eyebrow">WEDDING BUS · 2026.12.05</p>
              <h2>예약자 명단</h2>
            </div>
            <p className="print-meta">
              총 {sorted.length}명 · 가는 편 {seatsFor(rows, "outbound").size}명 · 오는 편 {seatsFor(rows, "inbound").size}명
              <br />
              출력 {printedAt}
            </p>
          </header>
          <table className="print-table">
            <thead>
              <tr>
                <th>No</th>
                <th>좌석</th>
                <th>탑승</th>
                <th>성함</th>
                <th>연락처</th>
                <th>구분</th>
                <th>메모</th>
                <th>가는 편</th>
                <th>오는 편</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, index) => {
                const legs = legsOf(row.trip);
                return (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td className="print-strong">{row.seatNo}</td>
                    <td>{TRIP_LABEL[row.trip]}</td>
                    <td className="print-strong">{row.name}</td>
                    <td>{formatPhone(row.phone)}</td>
                    <td>{GROUP_LABEL[row.groupType]}</td>
                    <td>{row.note}</td>
                    <td className="print-check">{legs.includes("outbound") ? "□" : "–"}</td>
                    <td className="print-check">{legs.includes("inbound") ? "□" : "–"}</td>
                  </tr>
                );
              })}
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={9}>예약이 없습니다.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
