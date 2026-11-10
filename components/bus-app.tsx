"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { EVENT, GROUP_LABEL, GROUPS, SEAT_COUNT, TRIP_HINT, TRIP_LABEL, TRIPS } from "@/lib/config";
import { formatPhone } from "@/lib/format";
import type { GroupType, PublicReservation, SeatMap, Trip } from "@/lib/types";
import { LookupDialog } from "./lookup-dialog";
import { PhoneInput, type PhoneParts } from "./phone-input";
import { SeatMap as BusSeatMap } from "./seat-map";

const ERROR_TEXT: Record<string, string> = {
  invalid: "성함, 연락처, 구분, 좌석을 다시 확인해 주세요.",
  taken: "방금 다른 분이 예약한 좌석입니다. 다른 좌석을 선택해 주세요.",
  closed: "예약이 마감되었습니다.",
  setup: "예약 저장소가 아직 연결되지 않았습니다.",
  server: "잠시 후 다시 시도해 주세요.",
  rate: "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
};

function isOpen(holds: SeatMap, trip: Trip, seatNo: number) {
  const outbound = holds.outbound.includes(seatNo);
  const inbound = holds.inbound.includes(seatNo);
  if (trip === "round") return !outbound && !inbound;
  if (trip === "outbound") return !outbound;
  return !inbound;
}

function openCount(holds: SeatMap, trip: Trip) {
  let count = 0;
  for (let seatNo = 1; seatNo <= SEAT_COUNT; seatNo += 1) {
    if (isOpen(holds, trip, seatNo)) count += 1;
  }
  return count;
}

export function BusApp({ initial, localPreview }: { initial: SeatMap; localPreview: boolean }) {
  const [holds, setHolds] = useState(initial);
  const [closed, setClosed] = useState(initial.closed);
  const [trip, setTrip] = useState<Trip>("round");
  const [seat, setSeat] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phoneParts, setPhoneParts] = useState<PhoneParts>(["010", "", ""]);
  const phone = phoneParts.join("");
  const [group, setGroup] = useState<GroupType | "">("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<(PublicReservation & { phone: string }) | null>(null);
  const [lookupOpen, setLookupOpen] = useState(false);
  const seatRef = useRef<number | null>(null);
  seatRef.current = seat;

  const applySeats = useCallback((next: SeatMap) => {
    setHolds(next);
    setClosed(next.closed);
    setSeat((current) => {
      if (current == null || next.closed) return current == null ? null : null;
      return isOpen(next, trip, current) ? current : null;
    });
  }, [trip]);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/seats", { cache: "no-store" });
    if (!response.ok) return;
    const next = (await response.json()) as SeatMap;
    setHolds(next);
    setClosed(next.closed);
    const current = seatRef.current;
    if (current != null && (next.closed || !isOpen(next, trip, current))) {
      setSeat(null);
      setError("선택한 좌석이 예약되었습니다. 다른 좌석을 선택해 주세요.");
    }
  }, [trip]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  function chooseTrip(nextTrip: Trip) {
    setTrip(nextTrip);
    setError("");
    if (seat != null && !isOpen(holds, nextTrip, seat)) {
      setSeat(null);
      setError("이 탑승에는 선택할 수 없는 좌석입니다.");
    }
  }

  function chooseSeat(seatNo: number) {
    if (closed || !isOpen(holds, trip, seatNo)) return;
    setSeat(seatNo);
    setError("");
    setDone(null);
    if (window.matchMedia("(max-width: 860px)").matches) {
      window.requestAnimationFrame(() => {
        document.getElementById("booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (closed) {
      setError(ERROR_TEXT.closed);
      return;
    }
    if (seat == null) {
      setError("좌석을 선택해 주세요.");
      return;
    }
    if (!name.trim()) {
      setError("성함을 입력해 주세요.");
      return;
    }
    if (!/^01[016789]\d{7,8}$/.test(phone)) {
      setError("연락처를 010-0000-0000 형식으로 모두 입력해 주세요.");
      return;
    }
    if (!group) {
      setError("구분을 선택해 주세요.");
      return;
    }

    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatNo: seat, name, phone, trip, groupType: group, note, website }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        reservation?: PublicReservation;
        seats?: SeatMap;
      };
      if (!response.ok || !data.ok || !data.reservation) {
        if (data.seats) applySeats(data.seats);
        else void refresh();
        setError(ERROR_TEXT[data.error ?? "server"] ?? ERROR_TEXT.server);
        if (data.error === "taken") setSeat(null);
        return;
      }
      if (data.seats) applySeats(data.seats);
      setDone({ ...data.reservation, phone });
      setSeat(null);
      setNote("");
    } catch {
      setError(ERROR_TEXT.server);
    } finally {
      setPending(false);
    }
  }

  const closeLookup = useCallback(() => setLookupOpen(false), []);

  return (
    <>
      <a className="skip" href="#booking">예약으로 바로가기</a>
      <main className="wrap">
        <header className="top">
          <div>
            <p className="eyebrow">WEDDING BUS · 2026.12.05</p>
            <h1>
              <span>{EVENT.fromName}</span>
              <span className="arrow" aria-hidden="true">→</span>
              <span className="mark">{EVENT.toName}</span>
            </h1>
            <p className="sub"><strong>이왕혁 · 김수민</strong> · {EVENT.dateLabel}</p>
          </div>
          <button type="button" className="lookup-btn" onClick={() => setLookupOpen(true)}>
            예약 확인
          </button>
        </header>

        <section className="facts" aria-label="운행 정보">
          <div className="fact">
            <small>가는 편</small>
            <strong><span className="mark">{EVENT.departAt}</span></strong>
            <p>{EVENT.fromName}<br />{EVENT.fromAddress}</p>
          </div>
          <div className="fact">
            <small>오는 편</small>
            <strong><span className="mark">{EVENT.returnAt}</span></strong>
            <p>{EVENT.toName}<br />{EVENT.toAddress}</p>
          </div>
          <div className="fact">
            <small>예식</small>
            <strong>{EVENT.ceremony}</strong>
            <p>{EVENT.toPlace}<br />{EVENT.toName}</p>
          </div>
          <div className="fact">
            <small>예약 마감</small>
            <strong className="accent">13:00</strong>
            <p><span className="accent">{EVENT.deadlineLabel}</span><br />선착순 27석</p>
          </div>
        </section>

        {localPreview ? (
          <p className="local-note">이 화면은 이 컴퓨터에만 저장되는 미리보기입니다. Supabase를 연결하면 예약이 모두에게 공유됩니다.</p>
        ) : null}

        <div className="stage">
          <section aria-label="좌석표">
            <BusSeatMap holds={{ ...holds, closed }} trip={trip} selected={seat} closed={closed} onSelect={chooseSeat} />
            <ul className="legend">
              <li><i className="swatch" /> 빈 좌석</li>
              <li><i className="swatch selected" /> 선택</li>
              <li><i className="swatch taken" /> 예약됨</li>
              <li><i className="swatch partial" /> 편도만 예약</li>
            </ul>
            <p className="map-links">
              <a href="https://map.naver.com/p/search/%EC%9D%B4%EC%86%94%EA%B3%A0%EB%93%B1%ED%95%99%EA%B5%90" target="_blank" rel="noopener noreferrer">출발지 지도</a>
              <a href="https://map.naver.com/p/search/%EC%95%84%EC%9D%B4%EB%B2%A1%EC%8A%A4%20%EC%BB%A8%EB%B2%A4%EC%85%98" target="_blank" rel="noopener noreferrer">도착지 지도</a>
            </p>
          </section>

          <form id="booking" className="panel" onSubmit={submit} noValidate>
            <p className="remain">
              <span>{TRIP_LABEL[trip]} 남은 좌석 <strong>{openCount(holds, trip)}</strong>석</span>
              <button type="button" className="text-btn" onClick={() => void refresh()}>새로고침</button>
            </p>
            {closed ? <p className="banner">예약이 마감되었습니다. 이미 예약한 좌석은 예약 확인에서 볼 수 있습니다.</p> : null}
            <div className="segment" role="group" aria-label="탑승 구분">
              {TRIPS.map((item) => (
                <button key={item} type="button" aria-pressed={trip === item} onClick={() => chooseTrip(item)}>
                  {TRIP_LABEL[item]}
                </button>
              ))}
            </div>
            <p className="hint">{TRIP_HINT[trip]}</p>

            {done ? (
              <div className="ticket" role="status">
                <p className="eyebrow">예약 확정</p>
                <p className="seat-no"><span className="mark">{done.seatNo}</span></p>
                <p>{TRIP_LABEL[done.trip]} · {GROUP_LABEL[done.groupType]}</p>
                <p>{done.name}<br />{formatPhone(done.phone)}</p>
                <hr className="dashed" />
                <p>
                  {EVENT.departAt} {EVENT.fromName} 출발<br />
                  {EVENT.returnAt} {EVENT.toName} 출발
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setDone(null)}
                  >
                    다른 좌석 예약
                  </button>
                </div>
              </div>
            ) : (
              <>
                <label className="field">
                  <span>성함</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={40} />
                </label>
                <div className="field" role="group" aria-labelledby="phone-label">
                  <span id="phone-label">연락처</span>
                  <PhoneInput value={phoneParts} onChange={setPhoneParts} />
                </div>
                <p className="fine">연락처는 좌석 안내와 예약 확인에만 사용합니다.</p>
                <div className="segment" role="group" aria-label="구분">
                  {GROUPS.map((item) => (
                    <button key={item} type="button" aria-pressed={group === item} onClick={() => setGroup(item)}>
                      {item === "teacher" ? "교직원" : GROUP_LABEL[item]}
                    </button>
                  ))}
                </div>
                <label className="field">
                  <span>메모</span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={200}
                    placeholder="함께 앉고 싶은 분, 요청 사항"
                  />
                </label>
                <div className="hp" aria-hidden="true">
                  <label>
                    website
                    <input value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
                  </label>
                </div>
                {error ? <p className="error" role="alert">{error}</p> : null}
                <button className="solid" type="submit" disabled={pending || closed}>
                  {pending ? "예약하는 중" : seat ? `${seat}번 좌석 예약하기` : "좌석을 선택해 주세요"}
                </button>
              </>
            )}
          </form>
        </div>

        <footer className="foot">
          <p>예약 마감 <span className="mark">{EVENT.deadlineLabel}</span> · 좌석은 선착순입니다.</p>
          <Link href="/admin">관리</Link>
        </footer>
      </main>
      {lookupOpen ? <LookupDialog onClose={closeLookup} /> : null}
    </>
  );
}
