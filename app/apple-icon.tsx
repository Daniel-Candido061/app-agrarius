import { ImageResponse } from "next/og";

import { BrandMark } from "./brand-media";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f4f7f5",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <BrandMark size={132} outerRadius={28} innerRadius={18} />
      </div>
    ),
    size
  );
}
