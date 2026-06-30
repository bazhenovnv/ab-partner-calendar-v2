import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ab-event.pro' },
      { protocol: 'https', hostname: 'test.ab-event.pro' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    formats: ['image/webp', 'image/avif'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://backend:3001'}/api/:path*`,
      },
    ];
  },
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
