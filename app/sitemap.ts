import type { MetadataRoute } from "next";

import { gifs } from "@/lib/gifs";
import { pageUrl } from "@/lib/site";

const sitemap = (): MetadataRoute.Sitemap => [
  {
    changeFrequency: "weekly",
    lastModified: new Date(),
    priority: 1,
    url: pageUrl("/"),
  },
  ...gifs.map((gif) => ({
    changeFrequency: "monthly" as const,
    lastModified: new Date(),
    priority: 0.7,
    url: pageUrl(`/${gif.slug}`),
  })),
];

export default sitemap;
