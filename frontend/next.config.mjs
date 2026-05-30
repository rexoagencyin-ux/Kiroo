/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const nextConfig = {
  reactStrictMode: true,
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
