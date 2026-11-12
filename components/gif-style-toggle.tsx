"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useGifStyle } from "@/hooks/use-gif-style";
import type { GifStyle } from "@/lib/gifs";
import { GIF_STYLES, isGifStyle } from "@/lib/gifs";

const STYLE_LABELS: Record<GifStyle, string> = {
  orc: "Orc",
  videorc: "Videorc",
};

const GifStyleToggle = () => {
  const [style, setStyle] = useGifStyle();

  return (
    <ToggleGroup
      aria-label="Gif style"
      onValueChange={(value) => {
        const [next] = value;

        // Pressing the active item empties the group; keep the current style instead.
        if (isGifStyle(next)) {
          void setStyle(next);
        }
      }}
      size="sm"
      spacing={0}
      value={[style]}
      variant="outline"
    >
      {GIF_STYLES.map((option) => (
        <ToggleGroupItem key={option} value={option}>
          {STYLE_LABELS[option]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};

export { GifStyleToggle };
