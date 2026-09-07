"use client";

import { DownloadSimpleIcon, MarkdownLogoIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
