import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN;

const nextConfig: NextConfig = {
  async rewrites() {
    if (!apiOrigin) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
