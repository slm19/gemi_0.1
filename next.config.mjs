/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "replicate.com",
      },
      {
        protocol: "https",
        hostname: "replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: ['replicate.delivery', 'firebasestorage.googleapis.com'],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3005'],
    },
  },
  env: {
    NEXT_PUBLIC_BASE_URL: 'http://localhost:3005',
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      encoding: false,
    };
    return config;
  },
  optimizeFonts: true,
  swcMinify: true,
  cssModules: true,
  extractCSS: true,
};

export default nextConfig;
