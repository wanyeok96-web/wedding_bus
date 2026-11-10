export const SEAT_COUNT = 27;

export const DEADLINE_ISO = "2026-12-02T13:00:00+09:00";

export const EVENT = {
  dateLabel: "2026년 12월 5일 토요일",
  ceremony: "16:20",
  departAt: "14:30",
  returnAt: "18:10",
  deadlineLabel: "12월 2일 수요일 13:00",
  fromName: "이솔고등학교",
  fromAddress: "경기도 화성시 동탄순환대로 7길 10",
  toName: "아이벡스 컨벤션",
  toPlace: "AK플라자 광명점 5층",
  toAddress: "경기도 광명시 양지로 17",
} as const;

export const TRIPS = ["round", "outbound", "inbound"] as const;
export const GROUPS = ["teacher", "friend", "other"] as const;

export const TRIP_LABEL = {
  round: "왕복",
  outbound: "가는 편",
  inbound: "오는 편",
} as const;

export const GROUP_LABEL = {
  teacher: "이솔고 교직원",
  friend: "지인",
  other: "기타",
} as const;

export const TRIP_HINT = {
  round: "왕복은 가는 편과 오는 편이 모두 비어 있는 좌석만 선택할 수 있습니다.",
  outbound: "가는 편 좌석입니다. 빗금 친 자리는 오는 편만 예약되어 있어 선택할 수 있습니다.",
  inbound: "오는 편 좌석입니다. 빗금 친 자리는 가는 편만 예약되어 있어 선택할 수 있습니다.",
} as const;

export const SEAT_ROWS: number[][] = Array.from({ length: 9 }, (_, row) => {
  const start = row * 3 + 1;
  return [start, start + 1, start + 2];
});

export function isClosed(now = Date.now()) {
  return now >= Date.parse(DEADLINE_ISO);
}
