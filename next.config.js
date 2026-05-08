/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // IMPORTANT: do NOT set output: 'export' — this app must be dynamic (SSR + API routes).
  experimental: {
    // serverComponentsExternalPackages kept minimal; better-sqlite3 is used only in route handlers
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  webpack: (config) => {
    // better-sqlite3 is a native module — leave it alone on server
    config.externals = config.externals || [];
    return config;
  },
};
module.exports = nextConfig;
