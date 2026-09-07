import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GifActions } from "@/components/gif-actions";
import { GifPreview } from "@/components/gif-preview";
import { Badge } from "@/components/ui/badge";
import { getGifBySlug, gifs } from "@/lib/gifs";
import { SITE_NAME } from "@/lib/site";

interface GifPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const generateStaticParams = () =>
  gifs.map((gif) => ({
    slug: gif.slug,
  }));

export const generateMetadata = async ({
  params,
}: GifPageProps): Promise<Metadata> => {
  const { slug } = await params;
  const gif = getGifBySlug(slug);

  if (!gif) {
    return {
      title: "Not found",
    };
  }

  const description = `Copy or download the ${gif.title} reaction gif.`;
  const title = `${gif.title} · ${SITE_NAME}`;
  const cardImage = `/cards/${gif.slug}.jpg`;

  return {
    description,
    openGraph: {
      description,
      images: [
        {
          alt: gif.title,
          height: 630,
          type: "image/jpeg",
          url: cardImage,
          width: 1200,
        },
      ],
      title,
      type: "website",
      url: `/${gif.slug}`,
    },
    title: gif.title,
    twitter: {
      card: "summary_large_image",
      description,
      images: [cardImage],
      title,
    },
  };
};

const GifPage = async ({ params }: GifPageProps) => {
  const { slug } = await params;
  const gif = getGifBySlug(slug);

  if (!gif) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <Link className="text-muted-foreground text-sm" href="/">
        Back to search
      </Link>
      <GifPreview gif={gif} />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-wider uppercase">
            {gif.title}
          </h1>
          <div className="flex flex-wrap gap-2">
            {gif.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <GifActions gif={gif} />
      </div>
    </main>
  );
};

export default GifPage;
