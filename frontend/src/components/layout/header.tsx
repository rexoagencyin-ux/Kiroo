'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, LogOut, Menu, Package, ShoppingCart, User2, LayoutDashboard, X, ChevronRight } from 'lucide-react';
import { SearchBar } from './search-bar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/components/providers/auth-provider';
import { useCart } from '@/components/providers/cart-provider';
import { api } from '@/lib/api';
import { Category } from '@/lib/types';
import { getInitials } from '@/lib/utils';

export function Header() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    api.get<{ data: Category[] }>('/categories', false).then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
      {/* Announcement bar */}
      <div className="bg-accent text-center text-xs text-white">
        <div className="container py-1.5">Free shipping on orders over ₹999 · Easy 7-day returns</div>
      </div>

      <div className="container flex h-16 items-center gap-4">
        {/* Mobile menu button */}
        <button className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>

        <Link href="/" className="flex items-center gap-1 text-xl font-extrabold tracking-tight">
          <span className="text-accent">Modern</span>
          <span className="text-primary">Shop</span>
        </Link>

        {/* Desktop search */}
        <div className="hidden flex-1 lg:block">
          <SearchBar />
        </div>

        <div className="ml-auto flex items-center gap-1">
          {user?.role === 'admin' && (
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link href="/admin">
                <LayoutDashboard className="h-4 w-4" /> Admin
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
            <Link href="/profile/wishlist" aria-label="Wishlist">
              <Heart className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="relative">
            <Link href="/cart" aria-label="Cart">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="Account" className="ml-1">
                  <Avatar className="h-9 w-9">
                    {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.name} />}
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="truncate">{user.name}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User2 className="h-4 w-4" /> Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/orders">
                    <Package className="h-4 w-4" /> Orders
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/wishlist">
                    <Heart className="h-4 w-4" /> Wishlist
                  </Link>
                </DropdownMenuItem>
                {user.role === 'admin' && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <LayoutDashboard className="h-4 w-4" /> Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="ml-1">
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile search */}
      <div className="container pb-3 lg:hidden">
        <SearchBar />
      </div>

      {/* Desktop categories nav */}
      <nav className="hidden border-t lg:block">
        <div className="container flex items-center gap-6 overflow-x-auto py-2.5 text-sm no-scrollbar">
          <Link href="/products" className="font-medium text-accent hover:text-primary">
            All Products
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`} className="whitespace-nowrap text-muted-foreground hover:text-primary">
              {c.name}
            </Link>
          ))}
          <Link href="/products?filter=flash" className="whitespace-nowrap font-medium text-destructive">
            Flash Sale
          </Link>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-lg font-bold">
                <span className="text-accent">Modern</span>
                <span className="text-primary">Shop</span>
              </span>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-col">
              <Link href="/products" onClick={() => setMobileOpen(false)} className="flex items-center justify-between border-b py-3 font-medium">
                All Products <ChevronRight className="h-4 w-4" />
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/category/${c.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between border-b py-3 text-muted-foreground"
                >
                  {c.name} <ChevronRight className="h-4 w-4" />
                </Link>
              ))}
              <Link href="/products?filter=flash" onClick={() => setMobileOpen(false)} className="py-3 font-medium text-destructive">
                Flash Sale
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
