'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Facebook, Instagram, Twitter, Youtube, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';

const categories = [
  ['Smart Watches', 'smart-watches'],
  ['Earbuds', 'earbuds'],
  ['Cameras', 'cameras'],
  ['Projectors', 'projectors'],
  ['Gadgets', 'gadgets'],
  ['Home Electronics', 'home-electronics'],
];

export function Footer() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/newsletter', { email }, false);
      toast('Subscribed! Watch your inbox for deals.', 'success');
      setEmail('');
    } catch {
      toast('Subscription failed. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="mt-16 bg-accent text-white">
      <div className="container grid gap-8 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="text-2xl font-extrabold">
            Modern<span className="text-primary">Shop</span>
          </span>
          <p className="mt-3 max-w-xs text-sm text-white/70">
            Premium tech at modern prices. Smart watches, earbuds, cameras, projectors & more — delivered fast.
          </p>
          <div className="mt-4 flex gap-3">
            {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
              <a key={i} href="#" aria-label="social" className="rounded-full bg-white/10 p-2 hover:bg-primary">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-3 font-semibold">Shop</h4>
          <ul className="space-y-2 text-sm text-white/70">
            {categories.map(([name, slug]) => (
              <li key={slug}>
                <Link href={`/category/${slug}`} className="hover:text-primary">
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-semibold">Help</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link href="/profile/orders" className="hover:text-primary">Track Order</Link></li>
            <li><Link href="/profile" className="hover:text-primary">My Account</Link></li>
            <li><Link href="/products" className="hover:text-primary">All Products</Link></li>
            <li><Link href="/cart" className="hover:text-primary">Cart</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-semibold">Newsletter</h4>
          <p className="mb-3 text-sm text-white/70">Get exclusive offers and new arrivals first.</p>
          <form onSubmit={subscribe} className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              className="h-10 flex-1 rounded-md border border-white/20 bg-white/10 px-3 text-sm placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button type="submit" loading={loading} aria-label="Subscribe">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-2 py-4 text-xs text-white/60 sm:flex-row">
          <p>© {new Date().getFullYear()} Modern Shop. All rights reserved.</p>
          <p>Secure payments via Razorpay · COD available</p>
        </div>
      </div>
    </footer>
  );
}
