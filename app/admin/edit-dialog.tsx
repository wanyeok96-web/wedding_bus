"use client";

import { useEffect, useId, useState } from "react";
import { PhoneInput, type PhoneParts } from "@/components/phone-input";
import { SeatMap as BusSeatMap } from "@/components/seat-map";
import { GROUP_LABEL, GROUPS, TRIP_LABEL, TRIPS } from "@/lib/config";
import { legsOf, seatMapFrom } from "@/lib/rules";
import type { GroupType, Reservation, SeatMap, Trip } from "@/lib/types";

function splitPhone(phone: string): PhoneParts {
  if (phone.length === 10) return [phone.slice(0, 3), phone.slice(3, 6), phone.slice(6)];
  return [phone.slice(0, 3), phone.slice(3, 7), phone.slice(7, 11)];
}

function isOpen(holds: SeatMap, trip: Trip, seatNo: number) {
  return legsOf(trip).every((leg) => !(leg === "outbound" ? holds.outbound : holds.inbound).includes(seatNo));
}

export function EditDialog({
  reservation,
  rows,
  onClose,
  onRows,
}: {
  reservation: Reservation;
  rows: Reservation[];
  onClose: () => void;
  onRows: (rows: Reservation[]) => void;
}) {
  const titleId = useId();
  const [seat, setSeat] = useState(reservation.seatNo);
  const [trip, setTrip] = useState<Trip>(reservation.trip);
  const [name, setName] = useState(reservation.name);
  const [phoneParts, setPhoneParts] = useState<PhoneParts>(splitPhone(reservation.phone));
  const [group, setGroup] = useState<GroupType>(reservation.groupType);
  const [note, setNote] = useState(reservation.note);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const others = rows.filter((row) => row.id !== reservation.id);
  const holds: SeatMap = { ...seatMapFrom(others), closed: false };
  const seatOk = isOpen(holds, trip, seat);
  const phone = phoneParts.join("");

  useEffect(() => {
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

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("성함을 입력해 주세요.");
      return;
    }
    if (!/^01[016789]\d{7,8}$/.test(phone)) {
      setError("연락처를 010-0000-0000 형식으로 모두 입력해 주세요.");
      return;
    }
    if (!seatOk) {
      setError(`${seat}번 좌석은 ${TRIP_LABEL[trip]}에 다른 예약이 있습니다. 다른 좌석을 골라 주세요.`);
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reservation.id, seatNo: seat, trip, name, phone, groupType: group, note }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; reservations?: Reservation[] };
      if (data.reservations) onRows(data.reservations);
      if (!response.ok || !data.ok) {
        setError(
          data.error === "taken"
            ? "방금 다른 분이 이 좌석을 예약했습니다. 다른 좌석을 골라 주세요."
            : data.error === "missing"
              ? "이미 취소된 예약입니다."
              : "저장하지 못했습니다. 입력 내용을 확인해 주세요.",
        );
        return;
      }
      onClose();
    } catch {
      setError("잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="backdrop">
      <form className="dialog edit-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={save} noValidate>
        <div className="dialog-head">
          <div>
            <p className="eyebrow">EDIT</p>
            <h2 id={titleId}>예약 수정</h2>
          </div>
          <button type="button" className="close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>

        <div className="edit-grid">
          <div>
            <div className="segment" role="group" aria-label="탑승 구분">
              {TRIPS.map((item) => (
                <button key={item} type="button" aria-pressed={trip === item} onClick={() => setTrip(item)}>
                  {TRIP_LABEL[item]}
                </button>
              ))}
            </div>
            <BusSeatMap compact holds={holds} trip={trip} selected={seat} closed={false} onSelect={setSeat} />
            <p className="fine edit-seat">
              선택한 좌석 <strong className={seatOk ? undefined : "accent"}>{seat}번</strong>
              {seatOk ? "" : " · 이 탑승 편에는 다른 예약이 있습니다"}
            </p>
          </div>

          <div>
            <label className="field">
              <span>성함</span>
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} />
            </label>
            <div className="field" role="group" aria-labelledby={`${titleId}-phone`}>
              <span id={`${titleId}-phone`}>연락처</span>
              <PhoneInput value={phoneParts} onChange={setPhoneParts} />
            </div>
            <div className="segment" role="group" aria-label="구분">
              {GROUPS.map((item) => (
                <button key={item} type="button" aria-pressed={group === item} onClick={() => setGroup(item)}>
                  {item === "teacher" ? "교직원" : GROUP_LABEL[item]}
                </button>
              ))}
            </div>
            <label className="field">
              <span>관리자 메모</span>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder="하객에게는 보이지 않습니다" />
            </label>
          </div>
        </div>

        {error ? <p className="error" role="alert">{error}</p> : null}
        <div className="actions edit-actions">
          <button type="button" className="ghost" onClick={onClose} disabled={pending}>
            닫기
          </button>
          <button type="submit" className="solid" disabled={pending}>
            {pending ? "저장하는 중" : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
