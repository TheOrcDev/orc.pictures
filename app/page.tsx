import type { Metadata } from "next";
import { Suspense } from "react";

import { GifPicker } from "@/components/gif-picker";
import { gifs } from "@/lib/gifs";

export const metadata: Metadata = {
  description: "Search and copy personal orc reaction gifs.",
  title: "orc.pictures",
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

const Page = async ({ searchParams }: PageProps) => {
  const params = await searchParams;
  const [q = ""] = [params.q].flat();

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-wider uppercase">
          orc.pictures
        </h1>
        <p className="text-muted-foreground text-sm">
          Search orc reaction gifs
        </p>
      </header>
      <Suspense>
        <GifPicker gifs={gifs} initialQuery={q} />
      </Suspense>
    </main>
  );
};

export default Page;
