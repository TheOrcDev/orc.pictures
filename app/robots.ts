import type { MetadataRoute } from "next";

import { pageUrl } from "@/lib/site";

const robots = (): MetadataRoute.Robots => ({
  rules: {
    allow: "/",
    userAgent: "*",
  },
  sitemap: pageUrl("/sitemap.xml"),
});

export default robots;
