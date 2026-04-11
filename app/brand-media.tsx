type BrandMarkProps = {
  size: number;
  outerRadius?: number;
  innerRadius?: number;
};

export const BRAND_COLORS = {
  background: "#17352b",
  backgroundSoft: "#204638",
  accent: "#8fcf8f",
  accentSoft: "#d8f3d2",
  surface: "#f8faf9",
  surfaceSoft: "#f4f7f5",
  textSoft: "#e7f3eb",
};

export const SHARE_IMAGE_SIZE = {
  width: 1200,
  height: 630,
};

export function BrandMark({
  size,
  outerRadius = Math.round(size * 0.1875),
  innerRadius = Math.round(size * 0.125),
}: BrandMarkProps) {
  const outerInset = Math.round(size * 0.0625);
  const innerInset = Math.round(size * 0.1875);
  const blockSize = Math.round(size * 0.203125);
  const accentSize = Math.round(size * 0.15625);
  const lineInset = Math.round(size * 0.46875);
  const topBlockOffset = Math.round(size * 0.296875);
  const cornerOffset = Math.round(size * 0.28125);
  const strokeOffset = Math.round(size * 0.40625);
  const checkLeft = Math.round(size * 0.34375);
  const checkTop = Math.round(size * 0.390625);
  const checkWidth = Math.round(size * 0.21875);
  const checkHeight = Math.round(size * 0.125);

  return (
    <div
      style={{
        background: BRAND_COLORS.background,
        borderRadius: outerRadius,
        display: "flex",
        height: size,
        padding: outerInset,
        position: "relative",
        width: size,
      }}
    >
      <div
        style={{
          background: BRAND_COLORS.backgroundSoft,
          borderRadius: innerRadius,
          display: "flex",
          height: "100%",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: BRAND_COLORS.surface,
            height: blockSize,
            left: innerInset,
            position: "absolute",
            top: innerInset,
            width: blockSize,
          }}
        />
        <div
          style={{
            background: BRAND_COLORS.accent,
            height: accentSize,
            position: "absolute",
            right: innerInset,
            top: innerInset,
            width: accentSize,
          }}
        />
        <div
          style={{
            background: BRAND_COLORS.accentSoft,
            bottom: innerInset,
            height: accentSize,
            position: "absolute",
            right: innerInset,
            width: accentSize,
          }}
        />
        <div
          style={{
            background: BRAND_COLORS.surface,
            borderRadius: size * 0.02,
            height: Math.max(6, Math.round(size * 0.0375)),
            left: lineInset,
            position: "absolute",
            top: topBlockOffset,
            width: Math.round(size * 0.078125),
          }}
        />
        <div
          style={{
            background: BRAND_COLORS.accent,
            borderRadius: size * 0.02,
            height: Math.max(6, Math.round(size * 0.0375)),
            left: lineInset,
            position: "absolute",
            top: Math.round(size * 0.5625),
            width: Math.round(size * 0.078125),
          }}
        />
        <div
          style={{
            borderBottom: `${Math.max(6, Math.round(size * 0.0390625))}px solid ${BRAND_COLORS.surface}`,
            borderLeft: `${Math.max(6, Math.round(size * 0.0390625))}px solid ${BRAND_COLORS.surface}`,
            borderRadius: Math.round(size * 0.02),
            bottom: cornerOffset,
            height: Math.round(size * 0.15625),
            left: strokeOffset,
            position: "absolute",
            width: Math.round(size * 0.109375),
          }}
        />
        <div
          style={{
            borderBottom: `${Math.max(7, Math.round(size * 0.0390625))}px solid ${BRAND_COLORS.accent}`,
            borderLeft: `${Math.max(7, Math.round(size * 0.0390625))}px solid ${BRAND_COLORS.accent}`,
            borderRadius: Math.round(size * 0.02),
            height: checkHeight,
            left: checkLeft,
            position: "absolute",
            top: checkTop,
            transform: "rotate(-45deg)",
            width: checkWidth,
          }}
        />
      </div>
    </div>
  );
}

export function BrandShareArtwork() {
  return (
    <div
      style={{
        alignItems: "center",
        background: BRAND_COLORS.surfaceSoft,
        color: BRAND_COLORS.background,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        padding: 48,
        width: "100%",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(140deg, #10271f 0%, #17352b 52%, #204638 100%)",
          borderRadius: 36,
          boxShadow: "0 28px 80px rgba(8, 39, 21, 0.24)",
          color: "white",
          display: "flex",
          gap: 52,
          height: "100%",
          padding: "54px 58px",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 32,
            inset: 18,
            position: "absolute",
          }}
        />
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flex: 1,
            gap: 48,
            position: "relative",
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 32,
              display: "flex",
              height: 240,
              justifyContent: "center",
              width: 240,
            }}
          >
            <BrandMark size={180} />
          </div>

          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div
              style={{
                color: BRAND_COLORS.accentSoft,
                display: "flex",
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              Sistema interno
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 78,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              Agrarius Gestao
            </div>
            <div
              style={{
                color: BRAND_COLORS.textSoft,
                display: "flex",
                fontSize: 32,
                lineHeight: 1.35,
                maxWidth: 700,
              }}
            >
              Gestao de clientes, servicos, tarefas, prazos e financeiro em um
              unico ambiente organizado.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
