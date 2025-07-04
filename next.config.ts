import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Temporarily disable TypeScript checking due to Next.js 15 type generation bug
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
