"use client";

import { CopyIcon, GifIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { copyGifFile, copyGifUrl } from "@/lib/gif-clipboard";
import { gifAbsoluteUrl } from "@/lib/gif-share";
import type { Gif } from "@/lib/gifs";

interface GifCopyButtonsProps {
  gif: Gif;
  size?: "default" | "xs";
}

const GifCopyButtons = ({ gif, size = "default" }: GifCopyButtonsProps) => {
  const [copyingFile, setCopyingFile] = useState(false);
  const filename = `${gif.slug}.gif`;

  const onCopyUrl = async (): Promise<void> => {
    try {
      await copyGifUrl(gifAbsoluteUrl(gif.file, window.location.origin));
      toast.add({
        description: gif.title,
        title: "Copied URL",
        type: "success",
      });
    } catch {
      toast.add({
        description: "The browser blocked clipboard access.",
        title: "Could not copy URL",
        type: "error",
      });
    }
  };

  const onCopyGif = async (): Promise<void> => {
    if (copyingFile) {
      return;
    }

    setCopyingFile(true);

    try {
      const result = await copyGifFile(gif.file, filename);

      if (result === "copied") {
        toast.add({
          description: "Paste it into X.",
          title: "Copied GIF",
          type: "success",
        });
        setCopyingFile(false);
        return;
      }

      toast.add({
        description: "Attach the downloaded file in X.",
        title: "Downloaded GIF",
        type: "success",
      });
      setCopyingFile(false);
    } catch {
      toast.add({
        description: "Could not copy or download this GIF.",
        title: "GIF copy failed",
        type: "error",
      });
      setCopyingFile(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      <Button
        className="flex-1"
        onClick={onCopyUrl}
        size={size}
        type="button"
        variant="outline"
      >
        <CopyIcon data-icon="inline-start" />
        Copy URL
      </Button>
      <Button
        className="flex-1"
        disabled={copyingFile}
        onClick={onCopyGif}
        size={size}
        type="button"
      >
        <GifIcon data-icon="inline-start" />
        Copy GIF
      </Button>
    </div>
  );
};

export { GifCopyButtons };
