# 결혼식 버스 좌석 예약

2026년 12월 5일, 이솔고등학교에서 아이벡스 컨벤션으로 가는 27인승 버스 예약 페이지입니다.

- 가는 편 14:30, 오는 편 18:10
- 왕복, 가는 편, 오는 편을 따로 예약합니다.
- 예약 마감은 2026년 12월 2일 수요일 13:00입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

Supabase 키가 없으면 개발 서버는 이 컴퓨터의 `.data` 폴더에만 저장합니다.

## Supabase

1. SQL Editor에서 `supabase/schema.sql`을 실행합니다.
2. Project Settings → API의 `service_role` 키를 복사합니다. 이 키는 브라우저에 넣지 않습니다.

## Vercel

저장소 `wanyeok96-web/wedding_bus`를 연결하고 환경 변수를 넣습니다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`

관리 화면은 `/admin`입니다.

## 글꼴

`public/fonts`에는 한국교육학술정보원(KERIS)의 학교안심 포스터 B, 학교안심 출석부 L·B를 웹용(woff2)으로 변환해 넣었습니다.
