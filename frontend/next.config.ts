import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Tree-shake icon imports — reduces client bundle
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // Security headers added at Next.js level (complements Nginx)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

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
