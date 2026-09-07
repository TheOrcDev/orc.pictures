import { Skeleton } from "@/components/ui/skeleton";

const FALLBACK_TILES = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
] as const;

const GifPickerFallback = () => (
  <div className="flex flex-col gap-8">
    <p className="sr-only">Loading gifs</p>
    <Skeleton className="h-10 w-full" />
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {FALLBACK_TILES.map((tile) => (
        <div className="flex flex-col gap-2" key={tile}>
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  </div>
);

export { GifPickerFallback };
