"use client";

import { useEffect, useId, useRef } from "react";
import { EVENT, TRIP_LABEL } from "@/lib/config";
import { legsOf } from "@/lib/rules";
import type { PublicReservation } from "@/lib/types";

export function BookingDoneDialog({
  reservation,
  onClose,
}: {
  reservation: PublicReservation;
  onClose: () => void;
}) {
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const legs = legsOf(reservation.trip);

  useEffect(() => {
    confirmRef.current?.focus();
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

  return (
    <div className="backdrop">
      <div className="dialog done-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="done-body">
          <div className="dialog-head">
            <div>
              <p className="eyebrow">THANK YOU</p>
              <h2 id={titleId}>예약이 완료되었습니다</h2>
            </div>
            <button type="button" className="close" onClick={onClose} aria-label="닫기">
              ×
            </button>
          </div>

          <p className="done-thanks">
            바쁘신 와중에도 저희 결혼식에 함께해 주셔서 진심으로 감사드립니다.
            <br />
            편히 오실 수 있도록 버스 좌석을 준비해 두었습니다.
          </p>

          <div className="done-seat">
            <p className="seat-no"><span className="mark">{reservation.seatNo}</span></p>
            <div>
              <p><strong>{reservation.seatNo}번 좌석</strong> · {TRIP_LABEL[reservation.trip]}</p>
              <p>{reservation.name}님</p>
              <p className="fine">이 화면을 캡처해 두시면 당일 확인이 편하십니다.</p>
            </div>
          </div>

          <section className="done-section" aria-label="탑승 안내">
            <h3>탑승 안내</h3>
            <dl className="done-legs">
              {legs.includes("outbound") ? (
                <div>
                  <dt>가는 편</dt>
                  <dd>
                    <strong>12월 5일(토) <span className="mark">{EVENT.departAt}</span> 출발</strong>
                    <br />
                    {EVENT.fromName} 정문
                    <br />
                    <span className="fine">{EVENT.fromAddress}</span>
                  </dd>
                </div>
              ) : null}
              {legs.includes("inbound") ? (
                <div>
                  <dt>오는 편</dt>
                  <dd>
                    <strong>12월 5일(토) <span className="mark">{EVENT.returnAt}</span> 출발</strong>
                    <br />
                    {EVENT.toName} ({EVENT.toPlace})
                    <br />
                    <span className="fine">동탄행 복귀 버스 탑승 위치는 당일 다시 안내드립니다.</span>
                  </dd>
                </div>
              ) : null}
            </dl>
            <p className="accent done-strong">
              버스는 정시에 출발합니다. 출발 5분 전까지 탑승 장소에 도착해 주시기 바랍니다.
            </p>
          </section>

          <section className="done-notice" aria-label="변경 및 취소 안내">
            <p className="accent done-strong">
              좌석이나 탑승 편을 변경하실 경우, 꼭 이왕혁에게 직접 말씀해 주시기 바랍니다.
            </p>
            <p>
              예약 사이트에서는 직접 변경하실 수 없으며, 다른 분의 좌석과 겹치지 않도록 확인이 필요합니다.
              <br />
              예약 취소는 화면 위쪽 <strong>예약 확인 및 취소</strong>에서 직접 하실 수 있습니다.
            </p>
          </section>

          <p className="fine done-foot">
            예약하신 좌석은 언제든 화면 위쪽 <strong>예약 확인 및 취소</strong>에서 성함과 전화번호 뒷자리로 다시 보실 수 있습니다.
          </p>
        </div>

        <div className="done-actions">
          <button ref={confirmRef} type="button" className="solid" onClick={onClose}>
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}
