import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

export const OG_SIZE = {
  height: 630,
  width: 1200,
};

interface OgImageOptions {
  imageDataUrl?: string;
  subtitle: string;
  title: string;
}

export const posterDataUrl = async (posterPath: string): Promise<string> => {
  const file = await readFile(
    path.join(process.cwd(), "public", posterPath.replace(/^\//u, ""))
  );

  return `data:image/jpeg;base64,${file.toString("base64")}`;
};

export const createOgImage = ({
  imageDataUrl,
  subtitle,
  title,
}: OgImageOptions): ImageResponse =>
  new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#14140f",
        color: "#f4f1e8",
        display: "flex",
        gap: 56,
        height: "100%",
        padding: 72,
        width: "100%",
      }}
    >
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
            color: "#8fad74",
            display: "flex",
            fontSize: 28,
            letterSpacing: 8,
            textTransform: "uppercase",
          }}
        >
          orc.pictures
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1.05,
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: "#c4c0b0",
            display: "flex",
            fontSize: 30,
          }}
        >
          {subtitle}
        </div>
      </div>
      {imageDataUrl ? (
        // ImageResponse / Satori only accepts <img>, not next/image.
        // oxlint-disable-next-line next/no-img-element
        <img
          alt=""
          height={420}
          src={imageDataUrl}
          style={{ borderRadius: 8, objectFit: "cover" }}
          width={420}
        />
      ) : null}
    </div>,
    {
      height: OG_SIZE.height,
      width: OG_SIZE.width,
    }
  );
