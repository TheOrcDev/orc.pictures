"use client";

import { DownloadSimpleIcon, MarkdownLogoIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { gifAbsoluteUrl, gifMarkdown } from "@/lib/gif-share";
import type { Gif } from "@/lib/gifs";

interface GifActionsProps {
  gif: Gif;
}

const GifActions = ({ gif }: GifActionsProps) => {
  const shareUrl = (): string =>
    gifAbsoluteUrl(gif.file, window.location.origin);

  const onCopyMarkdown = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(gifMarkdown(gif.title, shareUrl()));
      toast.add({
        title: "Copied markdown",
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
            download={`${gif.slug}.gif`}
            href={gif.file}
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
