import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { SiteChrome } from '@/components/layout/site-chrome';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Modern Shop — Premium Tech at Modern Prices',
    template: '%s · Modern Shop',
  },
  description:
    'Shop smart watches, earbuds, cameras, projectors, gadgets and home electronics at Modern Shop. Fast shipping, secure payments, COD available.',
  keywords: ['ecommerce', 'smart watches', 'earbuds', 'cameras', 'gadgets', 'electronics'],
  openGraph: {
    title: 'Modern Shop',
    description: 'Premium tech at modern prices.',
    url: siteUrl,
    siteName: 'Modern Shop',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
