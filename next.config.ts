import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The admin media route accepts up to 15 MiB; proxy must preserve the same body.
    proxyClientMaxBodySize: 15 * 1024 * 1024,
  },
  outputFileTracingIncludes: {
    '/admin/api/drafts/*/media': [
      './node_modules/.pnpm/@img+sharp-linux-x64@0.35.5*/node_modules/@img/sharp-linux-x64/**/*',
      './node_modules/.pnpm/@img+sharp-libvips-linux-x64@1.3.4*/node_modules/@img/sharp-libvips-linux-x64/**/*',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
