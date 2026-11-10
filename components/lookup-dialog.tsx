"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GROUP_LABEL, TRIP_LABEL } from "@/lib/config";
import { formatWhen } from "@/lib/format";
import type { PublicReservation, SeatMap, Trip } from "@/lib/types";
import { SeatMap as BusSeatMap } from "./seat-map";

const emptyHolds: SeatMap = { outbound: [], inbound: [], closed: false };

export function LookupDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [last4, setLast4] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<PublicReservation[] | null>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setResults(null);
    if (!name.trim() || last4.replace(/\D/g, "").length < 4) {
      setError("성함과 전화번호 뒷자리 4자리를 입력해 주세요.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, last4 }),
      });
      const data = (await response.json()) as { reservations?: PublicReservation[]; error?: string };
      if (!response.ok) {
        setError(data.error === "rate" ? "요청이 많습니다. 잠시 후 다시 시도해 주세요." : "다시 입력해 주세요.");
        return;
      }
      setResults(data.reservations ?? []);
    } catch {
      setError("잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  const highlights = results?.map((reservation) => reservation.seatNo) ?? [];

  return (
    <div
      className="backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="dialog-head">
          <h2 id={titleId}>예약 확인</h2>
          <button type="button" className="close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <p className="hint" style={{ marginTop: 10 }}>
          예약할 때 입력한 성함과 전화번호 뒷자리 4자리로 좌석을 확인합니다.
        </p>
        <form onSubmit={submit}>
          <label className="field">
            <span>성함</span>
            <input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={40} />
          </label>
          <label className="field">
            <span>전화번호 뒷자리</span>
            <input
              value={last4}
              onChange={(event) => setLast4(event.target.value)}
              inputMode="numeric"
              autoComplete="off"
              maxLength={13}
              placeholder="1234"
            />
          </label>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button className="solid" type="submit" disabled={pending}>
            {pending ? "확인하는 중" : "좌석 확인"}
          </button>
        </form>
        {results && results.length === 0 ? <p role="status">일치하는 예약이 없습니다.</p> : null}
        {results && results.length > 0 ? (
          <div className="results">
            {results.map((reservation) => (
              <article className="result" key={reservation.id}>
                <p className="seat-no"><span className="mark">{reservation.seatNo}</span></p>
                <p>
                  {TRIP_LABEL[reservation.trip]} · {GROUP_LABEL[reservation.groupType]} · {reservation.name}
                </p>
                {reservation.note ? <p>{reservation.note}</p> : null}
                <p className="fine">{formatWhen(reservation.createdAt)} 예약</p>
              </article>
            ))}
            <BusSeatMap
              compact
              highlights={highlights}
              holds={emptyHolds}
              trip={"round" satisfies Trip}
              selected={null}
              closed
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
