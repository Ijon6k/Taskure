import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    const apiPort = process.env.PORT_API || "4000";
    const aiPort = process.env.PORT_AI || "5000";

    const envApi = process.env.NEXT_PUBLIC_API_URL;
    const rawApi = envApi && envApi.startsWith("http") ? envApi : `http://localhost:${apiPort}`;
    const targetApi = rawApi.endsWith("/api") ? rawApi : `${rawApi}/api`;

    const envAi = process.env.NEXT_PUBLIC_AI_URL;
    const rawAi = envAi && envAi.startsWith("http") ? envAi : `http://localhost:${aiPort}`;
    const targetAi = rawAi.includes("/api/ai") ? rawAi : `${rawAi}/api/ai`;

    return [
      {
        source: "/api/ai/:path*",
        destination: `${targetAi}/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${targetApi}/:path*`,
      },
    ];
  },
};

export default nextConfig;
