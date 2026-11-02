"use client";

import { DownloadSimpleIcon, MarkdownLogoIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { gifAbsoluteUrl, gifMarkdown } from "@/lib/gif-share";
import type { Gif, GifStyle } from "@/lib/gifs";
import { gifAsset } from "@/lib/gifs";

interface GifActionsProps {
  gif: Gif;
  style: GifStyle;
}

const GifActions = ({ gif, style }: GifActionsProps) => {
  const { file } = gifAsset(gif, style);
  const downloadName =
    file === gif.file ? `${gif.slug}.gif` : `${gif.slug}-${style}.gif`;
  const shareUrl = (): string => gifAbsoluteUrl(file, window.location.origin);

  const onCopyMarkdown = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(gifMarkdown(gif.title, shareUrl()));
      toast.success("Copied markdown");
    } catch {
      toast.error("Could not copy", {
        description: "The browser blocked clipboard access.",
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onCopyMarkdown} type="button" variant="outline">
        <MarkdownLogoIcon data-icon="inline-start" />
        Copy markdown
      </Button>
      <Button
        nativeButton={false}
        render={
          <a
            aria-label={`Download ${gif.title}`}
            download={downloadName}
            href={file}
          />
        }
        variant="ghost"
      >
        <DownloadSimpleIcon data-icon="inline-start" />
        Download
      </Button>
    </div>
  );
};

export { GifActions };
