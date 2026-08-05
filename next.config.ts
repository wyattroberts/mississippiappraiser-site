import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.DO_BUILD
    ? { typescript: { tsconfigPath: "./tsconfig.digitalocean.json" } }
    : {}),
};

export default nextConfig;
