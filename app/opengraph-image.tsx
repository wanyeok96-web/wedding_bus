import { ImageResponse } from "next/og";

export const alt = "이솔고등학교에서 아이벡스 컨벤션으로 가는 결혼식 버스";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          color: "#111111",
          padding: "56px",
          border: "18px solid #111111",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, letterSpacing: 4 }}>
          <span>WEDDING BUS</span>
          <span>2026.12.05</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 92, lineHeight: 0.95 }}>
          <span>ISOL</span>
          <span>IVEX</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 40 }}>
          <span>14:40</span>
          <span>27 SEATS</span>
          <span>18:10</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
