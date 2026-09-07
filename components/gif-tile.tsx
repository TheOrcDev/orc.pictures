"use client";

import Image from "next/image";
import { useState } from "react";

import { toast } from "@/components/ui/toast";
import type { Gif } from "@/lib/gifs";

interface GifTileProps {
  gif: Gif;
}

const copyText = async (value: string): Promise<void> => {
  await navigator.clipboard.writeText(value);
};

const copyMarkdown = async (markdown: string): Promise<void> => {
  await copyText(markdown);
  toast.add({
    title: "Copied markdown",
    type: "success",
  });
};

const GifTile = ({ gif }: GifTileProps) => {
  const [playing, setPlaying] = useState(false);

  const onCopy = async (): Promise<void> => {
    const url = new URL(gif.file, window.location.origin).toString();
    const markdown = `![${gif.title}](${url})`;

    try {
      await copyText(url);
      toast.add({
        actionProps: {
          children: "Markdown",
          onClick: () => {
            void copyMarkdown(markdown);
          },
        },
        description: gif.title,
        title: "Copied GIF URL",
        type: "success",
      });
    } catch {
      toast.add({
        description: "The browser blocked clipboard access.",
        title: "Could not copy",
        type: "error",
      });
    }
  };

  return (
    <button
      className="flex w-full flex-col gap-2 text-left"
      onBlur={() => {
        setPlaying(false);
      }}
      onClick={() => {
        void onCopy();
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
      <span className="truncate text-sm font-medium">{gif.title}</span>
    </button>
  );
};

export { GifTile };
