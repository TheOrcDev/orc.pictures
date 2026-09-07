import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/site";

const manifest = (): MetadataRoute.Manifest => ({
  background_color: "#ffffff",
  description: SITE_DESCRIPTION,
  display: "standalone",
  icons: [
    {
      sizes: "512x512",
      src: "/icon.png",
      type: "image/png",
    },
    {
      sizes: "180x180",
      src: "/apple-touch-icon.png",
      type: "image/png",
    },
  ],
  name: SITE_TITLE,
  short_name: SITE_NAME,
  start_url: "/",
  theme_color: "#1c1c16",
});

export default manifest;
