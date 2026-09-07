import Image from "next/image";

import type { Gif } from "@/lib/gifs";

interface GifGridProps {
  gifs: Gif[];
}

const GifGrid = ({ gifs }: GifGridProps) => (
  <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
    {gifs.map((gif) => (
      <li key={gif.slug}>
        <article className="flex flex-col gap-2">
          <div className="bg-muted relative aspect-square overflow-hidden">
            <Image
              alt={gif.title}
              className="object-cover"
              fill
              sizes="(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
              src={gif.file}
              unoptimized
            />
          </div>
          <p className="truncate text-sm font-medium">{gif.title}</p>
        </article>
      </li>
    ))}
  </ul>
);

export { GifGrid };
