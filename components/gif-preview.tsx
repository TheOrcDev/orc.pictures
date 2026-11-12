"use client";

import Image from "next/image";

import { copyGifUrlWithToast } from "@/lib/copy-gif-url";
import type { Gif, GifStyle } from "@/lib/gifs";
import { gifAsset } from "@/lib/gifs";

interface GifPreviewProps {
  gif: Gif;
  style: GifStyle;
}

const GifPreview = ({ gif, style }: GifPreviewProps) => (
  <button
    className="bg-muted relative aspect-square w-full overflow-hidden text-left"
    onClick={() => copyGifUrlWithToast(gif, style)}
    type="button"
  >
    <Image
      alt={gif.title}
      className="object-contain"
      fill
      priority
      sizes="(min-width: 768px) 48rem, 100vw"
      src={gifAsset(gif, style).file}
      unoptimized
    />
    <span className="sr-only">Copy {gif.title} URL</span>
  </button>
);

export { GifPreview };
