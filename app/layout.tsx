import type { Metadata, Viewport } from "next";
import "./globals.css";

const FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Noto+Sans+KR:wght@400;500;600&family=Noto+Serif+KR:wght@500;600&display=swap";

export const metadata: Metadata = {
  title: "결혼식 버스 좌석 예약",
  description: "2026년 12월 5일 이솔고등학교 14:30 출발, 아이벡스 컨벤션 18:10 귀환. 27인승 선착순 예약.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "이왕혁 · 김수민 결혼식 버스",
    description: "12월 5일 14:30 이솔고 출발 · 18:10 귀환 · 27석 선착순",
    locale: "ko_KR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_CSS} />
      </head>
      <body>{children}</body>
    </html>
  );
}
