"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GROUP_LABEL, SEAT_COUNT, TRIP_LABEL } from "@/lib/config";
import { formatPhone, formatWhen } from "@/lib/format";
import type { Reservation } from "@/lib/types";
import { PrintSheet, type PrintMode } from "./print-sheet";

const PRINT_FILE: Record<PrintMode, string> = {
  all: "결혼식버스_좌석표_명단",
  seats: "결혼식버스_좌석표",
  roster: "결혼식버스_예약자명단",
};

function printStamp() {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    label: `${get("year")}.${get("month")}.${get("day")} ${get("hour")}:${get("minute")}`,
    file: `${get("year")}${get("month")}${get("day")}_${get("hour")}${get("minute")}`,
  };
}

function legCount(rows: Reservation[], leg: "outbound" | "inbound") {
  return rows.filter((row) => row.trip === "round" || row.trip === leg).length;
}

export function AdminClient() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Reservation[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode | null>(null);
  const [printedAt, setPrintedAt] = useState("");

  useEffect(() => {
    if (!printMode) return;
    const stamp = printStamp();
    setPrintedAt(stamp.label);
    const previousTitle = document.title;
    document.title = `${PRINT_FILE[printMode]}_${stamp.file}`;
    const restore = () => {
      document.title = previousTitle;
      setPrintMode(null);
    };
    window.addEventListener("afterprint", restore, { once: true });
    const frame = window.requestAnimationFrame(() => window.print());
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", restore);
      document.title = previousTitle;
    };
  }, [printMode]);

  async function load() {
    const response = await fetch("/api/admin/reservations", { cache: "no-store" });
    if (response.status === 401) {
      setAuthed(false);
      return;
    }
    const data = (await response.json()) as { reservations?: Reservation[]; error?: string };
    if (!response.ok || !data.reservations) {
      setError(data.error === "setup" ? "Supabase 연결이 필요합니다." : "명단을 불러오지 못했습니다.");
      setAuthed(false);
      return;
    }
    setRows(data.reservations);
    setAuthed(true);
    setError("");
  }

  useEffect(() => {
    void load();
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        setError(response.status === 429 ? "시도가 많습니다. 잠시 후 다시 입력해 주세요." : "비밀번호가 맞지 않습니다.");
        return;
      }
      setPassword("");
      await load();
    } catch {
      setError("잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setRows([]);
  }

  async function cancel(id: string) {
    setPending(true);
    try {
      const response = await fetch("/api/admin/reservations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json()) as { reservations?: Reservation[] };
      if (response.ok && data.reservations) setRows(data.reservations);
      setConfirmId(null);
    } finally {
      setPending(false);
    }
  }

  async function copyList() {
    const header = ["좌석", "탑승", "성함", "연락처", "구분", "메모", "예약시각"].join("\t");
    const body = rows
      .map((row) =>
        [
          row.seatNo,
          TRIP_LABEL[row.trip],
          row.name,
          formatPhone(row.phone),
          GROUP_LABEL[row.groupType],
          row.note,
          formatWhen(row.createdAt),
        ].join("\t"),
      )
      .join("\n");
    await navigator.clipboard.writeText(`${header}\n${body}`);
    setCopied(true);
  }

  if (authed === null) {
    return (
      <main className="wrap">
        <p className="eyebrow">ADMIN</p>
        <h1>명단을 불러오는 중</h1>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="wrap">
        <p className="eyebrow">ADMIN</p>
        <h1>예약 관리</h1>
        <form className="login" onSubmit={login}>
          <label className="field">
            <span>비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button className="solid" type="submit" disabled={pending}>
            {pending ? "확인하는 중" : "들어가기"}
          </button>
        </form>
        <p className="foot"><Link href="/">예약 화면</Link></p>
      </main>
    );
  }

  return (
    <>
    <main className="wrap admin-screen">
      <div className="admin-head">
        <div>
          <p className="eyebrow">ADMIN</p>
          <h1>예약 명단</h1>
        </div>
        <button type="button" className="ghost" style={{ width: "auto", padding: "0 16px" }} onClick={() => void logout()}>
          로그아웃
        </button>
      </div>
      <p className="counts">
        가는 편 {legCount(rows, "outbound")}/{SEAT_COUNT} · 오는 편 {legCount(rows, "inbound")}/{SEAT_COUNT} · {rows.length}건
      </p>
      <div className="admin-actions">
        <button type="button" className="ghost" onClick={() => void copyList()}>{copied ? "복사했습니다" : "명단 복사"}</button>
        <button type="button" className="ghost" onClick={() => void load()}>새로고침</button>
        <button type="button" className="solid" onClick={() => setPrintMode("seats")}>좌석표 PDF</button>
        <button type="button" className="solid" onClick={() => setPrintMode("roster")}>명단 PDF</button>
        <button type="button" className="solid" onClick={() => setPrintMode("all")}>전체 PDF</button>
      </div>
      <p className="fine">PDF 버튼을 누르면 인쇄 창이 열립니다. 대상(프린터)에서 <strong>PDF로 저장</strong>을 고른 뒤 저장해 주세요.</p>
      {rows.length === 0 ? <p>아직 예약이 없습니다.</p> : null}
      {rows.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>좌석</th>
                <th>탑승</th>
                <th>성함</th>
                <th>연락처</th>
                <th>구분</th>
                <th>메모</th>
                <th>시각</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.seatNo}</td>
                  <td>{TRIP_LABEL[row.trip]}</td>
                  <td>{row.name}</td>
                  <td>{formatPhone(row.phone)}</td>
                  <td>{GROUP_LABEL[row.groupType]}</td>
                  <td>{row.note}</td>
                  <td>{formatWhen(row.createdAt)}</td>
                  <td>
                    {confirmId === row.id ? (
                      <div className="confirm-line">
                        <button type="button" className="row-btn danger" disabled={pending} onClick={() => void cancel(row.id)}>
                          취소 확정
                        </button>
                        <button type="button" className="row-btn" onClick={() => setConfirmId(null)}>
                          닫기
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="row-btn" onClick={() => setConfirmId(row.id)}>
                        취소
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="foot"><Link href="/">예약 화면</Link></p>
    </main>
    <PrintSheet rows={rows} mode={printMode ?? "all"} printedAt={printedAt || printStamp().label} />
    </>
  );
}
