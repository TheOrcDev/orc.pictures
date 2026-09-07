import { getGifBySlug } from "@/lib/gifs";
import { createOgImage, posterDataUrl } from "@/lib/og-image";

export { OG_SIZE as size } from "@/lib/og-image";

export const alt = "orc.pictures reaction gif";
export const contentType = "image/png";

interface OpenGraphImageProps {
  params: Promise<{
    slug: string;
  }>;
}

const OpenGraphImage = async ({ params }: OpenGraphImageProps) => {
  const { slug } = await params;
  const gif = getGifBySlug(slug);
  const imageDataUrl = await posterDataUrl(gif?.poster ?? "/gifs/nod.jpg");

  return createOgImage({
    imageDataUrl,
    subtitle: "Reaction gif · orc.pictures",
    title: gif?.title ?? "orc.pictures",
  });
};

export default OpenGraphImage;
