import { ImageResponse } from "next/og";

export const alt = "Agrarius Gestão";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f4f7f5",
          color: "#17352b",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: "64px",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "#17352b",
            borderRadius: "8px",
            boxShadow: "0 28px 70px rgba(15, 23, 42, 0.24)",
            color: "white",
            display: "flex",
            gap: "54px",
            height: "100%",
            padding: "56px",
            width: "100%",
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "white",
              borderRadius: "8px",
              display: "flex",
              height: "188px",
              justifyContent: "center",
              width: "188px",
            }}
          >
            <div
              style={{
                background: "#17352b",
                borderRadius: "8px",
                display: "flex",
                height: "146px",
                padding: "18px",
                position: "relative",
                width: "146px",
              }}
            >
              <div
                style={{
                  background: "#f8faf9",
                  height: "44px",
                  left: "26px",
                  position: "absolute",
                  top: "26px",
                  width: "44px",
                }}
              />
              <div
                style={{
                  background: "#8fcf8f",
                  height: "34px",
                  position: "absolute",
                  right: "26px",
                  top: "26px",
                  width: "34px",
                }}
              />
              <div
                style={{
                  background: "#d8f3d2",
                  bottom: "26px",
                  height: "34px",
                  position: "absolute",
                  right: "26px",
                  width: "34px",
                }}
              />
              <div
                style={{
                  borderBottom: "8px solid #8fcf8f",
                  borderLeft: "8px solid #8fcf8f",
                  height: "26px",
                  left: "39px",
                  position: "absolute",
                  top: "42px",
                  transform: "rotate(-45deg)",
                  width: "46px",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div
              style={{
                color: "#d8f3d2",
                fontSize: "28px",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Sistema interno
            </div>
            <div
              style={{
                color: "white",
                fontSize: "76px",
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              Agrarius Gestão
            </div>
            <div
              style={{
                color: "#e7f3eb",
                fontSize: "34px",
                lineHeight: 1.35,
                maxWidth: "760px",
              }}
            >
              Gestão de clientes, serviços, tarefas, prazos e financeiro em um
              único ambiente organizado.
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
