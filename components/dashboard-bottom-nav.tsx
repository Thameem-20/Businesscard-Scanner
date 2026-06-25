'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Scan, CreditCard, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    title: 'My Team',
    icon: Users,
    href: '/dashboard/users',
    position: 'left',
  },
  {
    title: 'Scan Card',
    icon: Scan,
    href: '/dashboard/scan',
    position: 'center',
  },
  {
    title: 'My Cards',
    icon: CreditCard,
    href: '/dashboard/cards',
    position: 'right',
  },
];

export function DashboardBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-20 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const isCenter = item.position === 'center';

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center transition-all duration-200',
                isCenter
                  ? 'flex-1 max-w-[120px]'
                  : 'flex-1 max-w-[100px]',
                isActive && !isCenter && 'text-indigo-600'
              )}
            >
              <div
                className={cn(
                  'rounded-full flex items-center justify-center transition-all duration-200',
                  isCenter
                    ? 'w-16 h-16 -mt-8 bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 active:scale-95'
                    : isActive
                    ? 'w-12 h-12 bg-indigo-50 text-indigo-600'
                    : 'w-12 h-12 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                )}
              >
                <Icon className={isCenter ? 'h-7 w-7' : 'h-6 w-6'} />
              </div>
              <span
                className={cn(
                  'text-xs font-medium mt-1',
                  isCenter
                    ? 'text-indigo-600'
                    : isActive
                    ? 'text-indigo-600'
                    : 'text-gray-500'
                )}
              >
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
