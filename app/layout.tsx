import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const sans = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-serif",
  display: "swap",
});

const numeral = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-num",
  display: "swap",
});

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
      <body className={`${sans.variable} ${serif.variable} ${numeral.variable}`}>{children}</body>
    </html>
  );
}
