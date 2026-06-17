import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    allowedDevOrigins: ["192.168.1.5", "localhost:3000"]
  }
};

export default nextConfig;