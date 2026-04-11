import { ImageResponse } from "next/og";

import { BRAND_COLORS, BrandMark } from "./brand-media";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "radial-gradient(circle at top, #2f8b56 0%, #204638 42%, #17352b 100%)",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 104,
            boxShadow: "0 36px 80px rgba(8, 39, 21, 0.28)",
            display: "flex",
            height: 408,
            justifyContent: "center",
            width: 408,
          }}
        >
          <BrandMark size={320} />
        </div>
        <div
          style={{
            border: `1px solid ${BRAND_COLORS.accentSoft}24`,
            borderRadius: 136,
            height: 452,
            position: "absolute",
            width: 452,
          }}
        />
      </div>
    ),
    size
  );
}
