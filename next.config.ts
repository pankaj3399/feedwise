import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "postgres", "bcryptjs"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
