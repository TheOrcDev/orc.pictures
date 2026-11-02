"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { copyGifUrlWithToast } from "@/lib/copy-gif-url";
import type { Gif, GifStyle } from "@/lib/gifs";
import { gifAsset } from "@/lib/gifs";
import { serializeGifSearchParams } from "@/lib/search-params";

interface GifTileProps {
  gif: Gif;
  style: GifStyle;
}

const GifTile = ({ gif, style }: GifTileProps) => {
  const [playing, setPlaying] = useState(false);
  const asset = gifAsset(gif, style);

  return (
    <article className="flex flex-col gap-2">
      <button
        className="w-full text-left"
        onBlur={() => {
          setPlaying(false);
        }}
        onClick={() => copyGifUrlWithToast(gif, style)}
        onFocus={() => {
          setPlaying(true);
        }}
        onMouseEnter={() => {
          setPlaying(true);
        }}
        onMouseLeave={() => {
          setPlaying(false);
        }}
        type="button"
      >
        <div className="bg-muted relative aspect-square overflow-hidden">
          <Image
            alt={gif.title}
            className="object-cover"
            fill
            sizes="(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
            src={playing ? asset.file : asset.poster}
            unoptimized
          />
        </div>
        <span className="sr-only">Copy {gif.title} URL</span>
      </button>
      <Link
        className="truncate text-sm font-medium"
        href={serializeGifSearchParams(`/${gif.slug}`, { style })}
      >
        {gif.title}
      </Link>
    </article>
  );
};

export { GifTile };
