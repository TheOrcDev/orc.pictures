import { createOgImage, posterDataUrl } from "@/lib/og-image";

export { OG_SIZE as size } from "@/lib/og-image";

export const alt = "orc.pictures — search and copy orc reaction gifs";
export const contentType = "image/png";

const OpenGraphImage = async () => {
  const imageDataUrl = await posterDataUrl("/gifs/nod.jpg");

  return createOgImage({
    imageDataUrl,
    subtitle: "Search, hover to play, click to copy",
    title: "Orc reaction gifs",
  });
};

export default OpenGraphImage;
