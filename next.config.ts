import type { NextConfig } from "next";

// Lets phones on the local network load dev assets (e.g. http://192.168.99.126:3000).
// Extra hosts can be listed, comma-separated, in DEV_ORIGINS.
const devOrigins = ["192.168.99.126", ...(process.env.DEV_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [])];

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
};

export default nextConfig;
