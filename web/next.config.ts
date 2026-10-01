import type { NextConfig } from 'next';

const apiOrigin = (process.env.API_INTERNAL_URL ?? '').replace(/\/+$/, '');

const nextConfig: NextConfig = {
  async rewrites() {
    if (!apiOrigin || apiOrigin.startsWith('/')) return [];
    return [{ source: '/backend/:path*', destination: `${apiOrigin}/:path*` }];
  },
};

export default nextConfig;
