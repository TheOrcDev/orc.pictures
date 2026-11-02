import { GifTile } from "@/components/gif-tile";
import type { Gif, GifStyle } from "@/lib/gifs";

interface GifGridProps {
  gifs: Gif[];
  style: GifStyle;
}

const GifGrid = ({ gifs, style }: GifGridProps) => (
  <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
    {gifs.map((gif) => (
      <li key={gif.slug}>
        <GifTile gif={gif} style={style} />
      </li>
    ))}
  </ul>
);

export { GifGrid };
