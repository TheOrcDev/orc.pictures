import { toast } from "sonner";

import { copyGifUrl } from "@/lib/gif-clipboard";
import { gifAbsoluteUrl } from "@/lib/gif-share";
import type { Gif, GifStyle } from "@/lib/gifs";
import { gifAsset } from "@/lib/gifs";

export const copyGifUrlWithToast = async (
  gif: Gif,
  style: GifStyle
): Promise<void> => {
  try {
    await copyGifUrl(
      gifAbsoluteUrl(gifAsset(gif, style).file, window.location.origin)
    );
    toast.success("Copied URL", {
      description: gif.title,
    });
  } catch {
    toast.error("Could not copy URL", {
      description: "The browser blocked clipboard access.",
    });
  }
};
