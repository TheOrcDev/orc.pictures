import type { NextConfig } from "next";

const SOCIAL_CRAWLER_UA =
  ".*(Twitterbot|twitterbot|facebookexternalhit|Facebot|facebot|LinkedInBot|linkedinbot).*";

const nextConfig: NextConfig = {
  rewrites() {
    return {
      beforeFiles: [
        {
          destination: "/:slug",
          has: [
            {
              key: "user-agent",
              type: "header",
              value: SOCIAL_CRAWLER_UA,
            },
          ],
          source: "/gifs/:slug.gif",
        },
      ],
    };
  },
};

export default nextConfig;
