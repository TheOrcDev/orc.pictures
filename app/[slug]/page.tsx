import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { GifDetail, GifDetailView } from "@/components/gif-detail";
import { SiteBrand } from "@/components/site-brand";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_GIF_STYLE, getGifBySlug, gifs } from "@/lib/gifs";
import { gifPageDescription, SITE_NAME } from "@/lib/site";

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

  const description = gifPageDescription(gif.title);
  const title = `${gif.title} · ${SITE_NAME}`;
  const cardImage = `/cards/${gif.slug}.jpg`;
  const path = `/${gif.slug}`;

  return {
    alternates: {
      canonical: path,
    },
    description,
    keywords: gif.tags,
    openGraph: {
      description,
      images: [
        {
          alt: `${gif.title} orc reaction gif`,
          height: 630,
          type: "image/jpeg",
          url: cardImage,
          width: 1200,
        },
      ],
      title,
      type: "website",
      url: path,
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

  const heading = (
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
  );

  // The page is prerendered, so ?style is only known on the client; prerender the orc style.
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <SiteBrand compact />
      <Suspense
        fallback={
          <GifDetailView
            gif={gif}
            showStyleToggle={false}
            style={DEFAULT_GIF_STYLE}
          >
            {heading}
          </GifDetailView>
        }
      >
        <GifDetail gif={gif}>{heading}</GifDetail>
      </Suspense>
    </main>
  );
};

export default GifPage;
