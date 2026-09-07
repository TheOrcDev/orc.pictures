import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers() {
    return [
      {
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
        source: "/cards/:path*",
      },
    ];
  },
};

export default nextConfig;
