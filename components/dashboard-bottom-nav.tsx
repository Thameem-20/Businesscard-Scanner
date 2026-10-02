'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Scan, CreditCard, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Team', icon: Users, href: '/dashboard/users' },
  { title: 'Scan', icon: Scan, href: '/dashboard/scan', primary: true },
  { title: 'Cards', icon: CreditCard, href: '/dashboard/cards' },
];

export function DashboardBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/92 backdrop-blur-xl border-t border-slate-200/80"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-3 h-[56px] items-end px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center -mt-6"
              >
                <span className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/35 flex items-center justify-center active:scale-95 transition-transform">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-[10px] font-semibold text-indigo-600 mt-0.5 mb-1">Scan</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-h-[44px] mb-1',
                isActive ? 'text-indigo-600' : 'text-slate-400'
              )}
            >
              <Icon className={cn('h-6 w-6', isActive && 'stroke-[2.25]')} />
              <span className="text-[10px] font-semibold">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
