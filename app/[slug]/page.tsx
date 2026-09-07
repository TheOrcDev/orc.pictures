import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GifActions } from "@/components/gif-actions";
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

  return {
    description,
    openGraph: {
      description,
      images: [
        {
          alt: gif.title,
          height: gif.height,
          type: "image/jpeg",
          url: gif.poster,
          width: gif.width,
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
      images: [gif.poster],
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
      <div className="bg-muted relative aspect-square w-full overflow-hidden">
        <Image
          alt={gif.title}
          className="object-contain"
          fill
          priority
          sizes="(min-width: 768px) 48rem, 100vw"
          src={gif.file}
          unoptimized
        />
      </div>
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
