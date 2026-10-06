import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained server in .next/standalone for the Cloud Run image.
  output: "standalone",
};

export default nextConfig;
