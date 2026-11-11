"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GROUP_LABEL, TRIP_LABEL } from "@/lib/config";
import { formatWhen } from "@/lib/format";
import type { PublicReservation, SeatMap, Trip } from "@/lib/types";
import { PhoneInput, type PhoneParts } from "./phone-input";
import { SeatMap as BusSeatMap } from "./seat-map";

const emptyHolds: SeatMap = { outbound: [], inbound: [], closed: false };

export function LookupDialog({
  onClose,
  onCancelled,
}: {
  onClose: () => void;
  onCancelled: (seats: SeatMap) => void;
}) {
  const titleId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [last4, setLast4] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<PublicReservation[] | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelPhone, setCancelPhone] = useState<PhoneParts>(["010", "", ""]);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [notice, setNotice] = useState("");

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
    setNotice("");
    setResults(null);
    setCancelId(null);
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

  function startCancel(id: string) {
    setCancelId(id);
    setCancelPhone(["010", "", ""]);
    setCancelError("");
    setNotice("");
  }

  async function confirmCancel(reservation: PublicReservation) {
    const phone = cancelPhone.join("");
    if (!/^01[016789]\d{7,8}$/.test(phone) || !phone.endsWith(last4.replace(/\D/g, "").slice(-4))) {
      setCancelError("예약하실 때 입력하신 전화번호 전체를 정확히 입력해 주세요.");
      return;
    }
    setCancelPending(true);
    setCancelError("");
    try {
      const response = await fetch("/api/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reservation.id, name: reservation.name, phone }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; seats?: SeatMap };
      if (!response.ok || !data.ok) {
        setCancelError(
          data.error === "rate"
            ? "요청이 많습니다. 잠시 후 다시 시도해 주세요."
            : "전화번호가 예약 정보와 맞지 않습니다. 다시 확인해 주세요.",
        );
        return;
      }
      setResults((current) => current?.filter((item) => item.id !== reservation.id) ?? null);
      setCancelId(null);
      setNotice(`${reservation.seatNo}번 좌석(${TRIP_LABEL[reservation.trip]}) 예약이 취소되었습니다.`);
      if (data.seats) onCancelled(data.seats);
    } catch {
      setCancelError("잠시 후 다시 시도해 주세요.");
    } finally {
      setCancelPending(false);
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
          <h2 id={titleId}>예약 확인 및 취소</h2>
          <button type="button" className="close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <p className="hint" style={{ marginTop: 10 }}>
          예약하실 때 입력하신 성함과 전화번호 뒷자리 4자리로 좌석을 확인하실 수 있습니다.
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
        {notice ? <p className="cancel-notice" role="status">{notice}</p> : null}
        {results && results.length === 0 && !notice ? <p role="status">일치하는 예약이 없습니다.</p> : null}
        {results && results.length > 0 ? (
          <div className="results">
            {results.map((reservation) => (
              <article className="result" key={reservation.id}>
                <p className="seat-no"><span className="mark">{reservation.seatNo}</span></p>
                <div className="result-body">
                  <p>
                    {TRIP_LABEL[reservation.trip]} · {GROUP_LABEL[reservation.groupType]} · {reservation.name}
                  </p>
                  <p className="fine">{formatWhen(reservation.createdAt)} 예약</p>
                </div>
                {cancelId === reservation.id ? (
                  <div className="cancel-box">
                    <p className="accent cancel-title">이 예약을 취소하시겠습니까?</p>
                    <p className="fine">본인 확인을 위해 예약하실 때 입력하신 전화번호 전체를 입력해 주세요.</p>
                    <PhoneInput value={cancelPhone} onChange={setCancelPhone} disabled={cancelPending} />
                    {cancelError ? <p className="error" role="alert">{cancelError}</p> : null}
                    <div className="cancel-actions">
                      <button type="button" className="ghost" onClick={() => setCancelId(null)} disabled={cancelPending}>
                        돌아가기
                      </button>
                      <button type="button" className="solid danger" onClick={() => void confirmCancel(reservation)} disabled={cancelPending}>
                        {cancelPending ? "취소하는 중" : "예약 취소"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="text-btn result-cancel" onClick={() => startCancel(reservation.id)}>
                    예약 취소
                  </button>
                )}
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
