import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const logoBuffer = fs.readFileSync(
    path.join(process.cwd(), "public/images/logo/logo_intro.png")
  );
  const base64Logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#1d4ed8",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "7px",
        }}
      >
        <img
          src={base64Logo}
          style={{ width: "28px", height: "28px", objectFit: "contain" }}
        />
      </div>
    ),
    { ...size }
  );
}
