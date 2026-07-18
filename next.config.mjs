/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: [],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  webpack: (config, { nextRuntime }) => {
    if (nextRuntime === "edge") {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "@/lib/acr/sync": false,
        "./instrumentation.node": false,
        "./instrumentation.node.js": false,
      };
    }
    return config;
  },
  images: {
    // Cross-compile (Mac → Azure Linux) da sharp binary muammosini oldini olish
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
