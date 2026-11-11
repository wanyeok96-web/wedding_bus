"use client";

import { useEffect, useState } from "react";
import { GROUP_LABEL, TRIP_LABEL } from "@/lib/config";
import { formatPhone, formatWhen } from "@/lib/format";
import type { EventAction, ReservationEvent } from "@/lib/types";

const ACTION_LABEL: Record<EventAction, string> = { book: "신청", cancel: "취소", edit: "수정" };
const FILTERS = [
  { id: "all", label: "전체" },
  { id: "book", label: "신청" },
  { id: "cancel", label: "취소" },
  { id: "edit", label: "수정" },
] as const;

type Filter = (typeof FILTERS)[number]["id"];

export function EventLog({ refreshKey }: { refreshKey: number }) {
  const [events, setEvents] = useState<ReservationEvent[]>([]);
  const [ready, setReady] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/events", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { ready?: boolean; events?: ReservationEvent[] };
        if (!active) return;
        if (!response.ok) {
          setFailed(true);
          return;
        }
        setFailed(false);
        setReady(data.ready !== false);
        setEvents(data.events ?? []);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const shown = filter === "all" ? events : events.filter((event) => event.action === filter);
  const count = (action: EventAction) => events.filter((event) => event.action === action).length;

  return (
    <section className="event-log" aria-labelledby="event-log-title">
      <div className="event-head">
        <h2 id="event-log-title">신청·취소 기록</h2>
        <p className="counts">신청 {count("book")} · 취소 {count("cancel")} · 수정 {count("edit")}</p>
      </div>

      {!ready ? (
        <p className="banner">
          기록 기능을 쓰려면 Supabase SQL Editor에서 <strong>supabase/events.sql</strong>을 한 번 실행해 주세요.
        </p>
      ) : null}
      {failed ? <p className="error">기록을 불러오지 못했습니다. 새로고침해 주세요.</p> : null}

      {ready && !failed ? (
        <>
          <div className="segment event-filter" role="group" aria-label="기록 구분">
            {FILTERS.map((item) => (
              <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          {shown.length === 0 ? <p>기록이 없습니다.</p> : null}
          {shown.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>시각</th>
                    <th>구분</th>
                    <th>처리</th>
                    <th>좌석</th>
                    <th>탑승</th>
                    <th>성함</th>
                    <th>연락처</th>
                    <th>소속</th>
                    <th>내용</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((event) => (
                    <tr key={event.id}>
                      <td>{formatWhen(event.createdAt)}</td>
                      <td className={event.action === "cancel" ? "accent event-action" : "event-action"}>
                        {ACTION_LABEL[event.action]}
                      </td>
                      <td>{event.actor === "guest" ? "하객" : "관리자"}</td>
                      <td>{event.seatNo ?? "-"}</td>
                      <td>{event.trip ? TRIP_LABEL[event.trip] : "-"}</td>
                      <td>{event.name}</td>
                      <td>{event.phone ? formatPhone(event.phone) : "-"}</td>
                      <td>{event.groupType ? GROUP_LABEL[event.groupType] : "-"}</td>
                      <td>{event.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
