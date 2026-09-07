import { toast } from "@/components/ui/toast";
import { copyGifUrl } from "@/lib/gif-clipboard";
import { gifAbsoluteUrl } from "@/lib/gif-share";
import type { Gif } from "@/lib/gifs";

export const copyGifUrlWithToast = async (gif: Gif): Promise<void> => {
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
