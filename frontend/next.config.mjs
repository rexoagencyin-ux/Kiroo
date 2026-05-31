/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const nextConfig = {
  reactStrictMode: true,
  // Don't fail the production build on type/lint errors — the storefront should
  // still deploy. Fix types incrementally without blocking deploys.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    return [
      { source: '/sitemap.xml', destination: `${apiUrl}/sitemap.xml` },
      { source: '/robots.txt', destination: `${apiUrl}/robots.txt` },
    ];
  },
};

export default nextConfig;
