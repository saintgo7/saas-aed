/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb"
    }
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "r2.aed.abada.co.kr" }
    ]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      },
      {
        // Auth and entry pages must never be cached at the edge — DEMO redirect
        // and login state are per-request decisions.
        source: "/(login|login/check-email)",
        headers: [
          { key: "Cache-Control", value: "private, no-store, must-revalidate" }
        ]
      },
      {
        source: "/",
        headers: [
          { key: "Cache-Control", value: "private, no-store, must-revalidate" }
        ]
      }
    ]
  }
}

export default nextConfig
