"use client";

import type { ReactNode } from "react";

import { GifActions } from "@/components/gif-actions";
import { GifPreview } from "@/components/gif-preview";
import { GifStyleToggle } from "@/components/gif-style-toggle";
import { useGifStyle } from "@/hooks/use-gif-style";
import type { Gif, GifStyle } from "@/lib/gifs";

interface GifDetailViewProps {
  children: ReactNode;
  gif: Gif;
  showStyleToggle: boolean;
  style: GifStyle;
}

const GifDetailView = ({
  children,
  gif,
  showStyleToggle,
  style,
}: GifDetailViewProps) => (
  <>
    <GifPreview gif={gif} style={style} />
    <div className="flex flex-col gap-4">
      {children}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <GifActions gif={gif} style={style} />
        {showStyleToggle ? <GifStyleToggle /> : null}
      </div>
    </div>
  </>
);

interface GifDetailProps {
  children: ReactNode;
  gif: Gif;
}

const GifDetail = ({ children, gif }: GifDetailProps) => {
  const [style] = useGifStyle();

  return (
    <GifDetailView
      gif={gif}
      showStyleToggle={Boolean(gif.videorc)}
      style={style}
    >
      {children}
    </GifDetailView>
  );
};

export { GifDetail, GifDetailView };
