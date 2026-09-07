import { Suspense } from "react";

import { GifPicker } from "@/components/gif-picker";
import { SiteBrand } from "@/components/site-brand";
import { gifs } from "@/lib/gifs";

interface PageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

const Page = async ({ searchParams }: PageProps) => {
  const params = await searchParams;
  const [q = ""] = [params.q].flat();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col items-center gap-2 text-center">
        <SiteBrand />
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
