"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { copyGifUrlWithToast } from "@/lib/copy-gif-url";
import type { Gif } from "@/lib/gifs";

interface GifTileProps {
  gif: Gif;
}

const GifTile = ({ gif }: GifTileProps) => {
  const [playing, setPlaying] = useState(false);

  return (
    <article className="flex flex-col gap-2">
      <button
        className="w-full text-left"
        onBlur={() => {
          setPlaying(false);
        }}
        onClick={() => copyGifUrlWithToast(gif)}
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
            src={playing ? gif.file : gif.poster}
            unoptimized
          />
        </div>
        <span className="sr-only">Copy {gif.title} URL</span>
      </button>
      <Link className="truncate text-sm font-medium" href={`/${gif.slug}`}>
        {gif.title}
      </Link>
    </article>
  );
};

export { GifTile };
