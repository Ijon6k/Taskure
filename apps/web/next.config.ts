import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // turbo mode is handled by turbo.json
  },
  eslint: {
    // Don't fail build on lint errors during development
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
