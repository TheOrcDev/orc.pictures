"use client";

import { CopyIcon, GifIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  addGifToDataTransfer,
  canShareGifFile,
  copyGifUrl,
  isShareAbort,
  loadGifFile,
  peekGifFile,
  shareGifFile,
} from "@/lib/gif-clipboard";
import { gifAbsoluteUrl } from "@/lib/gif-share";
import type { Gif } from "@/lib/gifs";

interface GifCopyButtonsProps {
  gif: Gif;
  size?: "default" | "xs";
}

const showDragHint = (): void => {
  toast.add({
    description: "Drag the GIF onto the X composer.",
    title: "Drag the GIF",
    type: "error",
  });
};

const GifCopyButtons = ({ gif, size = "default" }: GifCopyButtonsProps) => {
  const [busy, setBusy] = useState(false);
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
    if (busy) {
      return;
    }

    const readyFile = file ?? peekGifFile(gif.file);

    if (readyFile && !file) {
      setFile(readyFile);
    }

    if (readyFile && canShareGifFile(readyFile)) {
      try {
        await shareGifFile(readyFile, gif.title);
        return;
      } catch (error) {
        if (error instanceof DOMException && isShareAbort(error)) {
          return;
        }
      }

      showDragHint();
      return;
    }

    setBusy(true);

    try {
      const nextFile = await ensureFile();

      if (canShareGifFile(nextFile)) {
        try {
          await shareGifFile(nextFile, gif.title);
          setBusy(false);
          return;
        } catch (error) {
          if (error instanceof DOMException && isShareAbort(error)) {
            setBusy(false);
            return;
          }
        }
      }

      showDragHint();
      setBusy(false);
    } catch {
      toast.add({
        description: "Could not load this GIF.",
        title: "Copy failed",
        type: "error",
      });
      setBusy(false);
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
        onPointerDown={prefetchFile}
      >
        <Button
          className="flex-1"
          disabled={busy}
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
