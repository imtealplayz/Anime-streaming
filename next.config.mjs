import withPWA from "next-pwa";
import defaultRuntimeCaching from "next-pwa/cache";

// Streaming discovery can legitimately exceed 10 seconds and must never
// reuse a cached HTML/challenge response from an earlier API request.
const runtimeCaching = defaultRuntimeCaching.map((rule) =>
  rule.options?.cacheName === "apis"
    ? { ...rule, handler: "NetworkOnly", options: {} }
    : rule,
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  runtimeCaching,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
