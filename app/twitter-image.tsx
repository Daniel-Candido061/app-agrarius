import { ImageResponse } from "next/og";

import { BrandShareArtwork, SHARE_IMAGE_SIZE } from "./brand-media";

export const alt = "Agrarius Gestao";
export const size = SHARE_IMAGE_SIZE;
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(<BrandShareArtwork />, size);
}
