import { Suspense } from "react";

import { GifPicker } from "@/components/gif-picker";
import { RaycastInstall } from "@/components/raycast-install";
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
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col items-center gap-4 text-center">
        <div className="flex flex-col items-center gap-2">
          <SiteBrand />
          <p className="text-muted-foreground text-sm">
            Search orc reaction gifs
          </p>
        </div>
        <RaycastInstall />
      </header>
      <Suspense>
        <GifPicker gifs={gifs} initialQuery={q} />
      </Suspense>
    </main>
  );
};

export default Page;
