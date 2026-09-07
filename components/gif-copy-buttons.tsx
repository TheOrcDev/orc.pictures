"use client";

import { CopyIcon, GifIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  addGifToDataTransfer,
  canShareGifFile,
  copyGifFile,
  copyGifUrl,
  isShareAbort,
  loadGifFile,
  shareGifFile,
} from "@/lib/gif-clipboard";
import { gifAbsoluteUrl } from "@/lib/gif-share";
import type { Gif } from "@/lib/gifs";

interface GifCopyButtonsProps {
  gif: Gif;
  size?: "default" | "xs";
}

const GifCopyButtons = ({ gif, size = "default" }: GifCopyButtonsProps) => {
  const [copyingFile, setCopyingFile] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const filename = `${gif.slug}.gif`;

  const ensureFile = async (): Promise<File> => {
    if (file) {
      return file;
    }

    const nextFile = await loadGifFile(gif.file, filename);
    setFile(nextFile);

    return nextFile;
  };

  const prefetchFile = async (): Promise<void> => {
    try {
      await ensureFile();
    } catch {
      // Click will surface a load error.
    }
  };

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
      const nextFile = await ensureFile();

      if (canShareGifFile(nextFile)) {
        try {
          await shareGifFile(nextFile);
          setCopyingFile(false);
          return;
        } catch (error) {
          if (error instanceof DOMException && isShareAbort(error)) {
            setCopyingFile(false);
            return;
          }
        }
      }

      await copyGifFile(nextFile);
      toast.add({
        description: "Paste it into X.",
        title: "Copied GIF",
        type: "success",
      });
      setCopyingFile(false);
    } catch {
      toast.add({
        description: "Drag this GIF onto X. Browsers cannot copy GIF files.",
        title: "Drag the GIF",
        type: "error",
      });
      setCopyingFile(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-1" onPointerEnter={prefetchFile}>
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
      <div
        className="flex flex-1"
        draggable={file !== null}
        onDragStart={(event) => {
          if (!file) {
            event.preventDefault();
            return;
          }

          addGifToDataTransfer(event.dataTransfer, file);
        }}
      >
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
    </div>
  );
};

export { GifCopyButtons };
