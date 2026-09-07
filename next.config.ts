import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  // Development only: phones and simulators on the same network load the dev server by
  // LAN address or Bonjour name, which Next otherwise blocks (no JavaScript would hydrate).
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*", "**.local"],
  async redirects() {
    return [
      // Stable CV download URL. The PDF is built from cv/ by `npm run cv:build`.
      { source: "/cv", destination: "/Viveak-Vadivelkarasan-CV.pdf", permanent: false },
      { source: "/cv.pdf", destination: "/Viveak-Vadivelkarasan-CV.pdf", permanent: false },
      { source: "/resume", destination: "/Viveak-Vadivelkarasan-CV.pdf", permanent: false },
      { source: "/lab", destination: "/lab/webhook-delivery", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/Viveak-Vadivelkarasan-CV.pdf",
        headers: [
          { key: "Content-Disposition", value: 'attachment; filename="Viveak-Vadivelkarasan-CV.pdf"' },
          { key: "Cache-Control", value: "public, max-age=3600, must-revalidate" },
        ],
      },
      {
        source: "/posters/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
