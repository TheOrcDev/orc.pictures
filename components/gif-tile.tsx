"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { GifCopyButtons } from "@/components/gif-copy-buttons";
import { addGifToDataTransfer, loadGifFile } from "@/lib/gif-clipboard";
import type { Gif } from "@/lib/gifs";

interface GifTileProps {
  gif: Gif;
}

const GifTile = ({ gif }: GifTileProps) => {
  const [playing, setPlaying] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const filename = `${gif.slug}.gif`;

  const prefetchFile = async (): Promise<void> => {
    if (file) {
      return;
    }

    try {
      const nextFile = await loadGifFile(gif.file, filename);
      setFile(nextFile);
    } catch {
      // Click or drag will surface a load error.
    }
  };

  return (
    <article className="flex flex-col gap-2" onPointerEnter={prefetchFile}>
      <button
        className="w-full text-left"
        draggable={file !== null}
        onBlur={() => {
          setPlaying(false);
        }}
        onClick={() => {
          setPlaying((current) => !current);
        }}
        onDragStart={(event) => {
          if (!file) {
            event.preventDefault();
            return;
          }

          addGifToDataTransfer(event.dataTransfer, file);
        }}
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
        <span className="sr-only">Play {gif.title}</span>
      </button>
      <Link className="truncate text-sm font-medium" href={`/${gif.slug}`}>
        {gif.title}
      </Link>
      <GifCopyButtons gif={gif} size="xs" />
    </article>
  );
};

export { GifTile };
