import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O PostgreSQL embutido (Fase 1) carrega ficheiros WebAssembly próprios:
  // fica fora do bundle e é resolvido directamente de node_modules.
  serverExternalPackages: ["@electric-sql/pglite", "pg", "bcryptjs"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
