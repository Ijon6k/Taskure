import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Use webpack instead of Turbopack for production build (more stable for workspaces)
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
