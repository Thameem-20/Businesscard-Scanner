'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRef } from 'react';
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
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScanClick = (e: React.MouseEvent, href: string) => {
    // On mobile, trigger file picker directly for scan button
    if (href === '/dashboard/scan') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Store file data in sessionStorage before navigating
    const reader = new FileReader();
    reader.onloadend = () => {
      sessionStorage.setItem('pendingScanFile', reader.result as string);
      sessionStorage.setItem('pendingScanFileName', file.name);
      sessionStorage.setItem('pendingScanFileType', file.type);
      // Navigate after file is stored
      router.push('/dashboard/scan');
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex items-center justify-around h-20 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const isCenter = item.position === 'center';
          const isScanButton = item.href === '/dashboard/scan';

          const content = (
            <>
              <div
                className={cn(
                  'rounded-full flex items-center justify-center transition-all duration-200',
                  isCenter
                    ? 'w-16 h-16 -mt-8 bg-indigo-600 text-white shadow-lg hover:bg-indigo-700'
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
            </>
          );

          if (isScanButton) {
            return (
              <button
                key={item.href}
                onClick={(e) => handleScanClick(e, item.href)}
                className={cn(
                  'flex flex-col items-center justify-center transition-all duration-200',
                  isCenter
                    ? 'flex-1 max-w-[120px]'
                    : 'flex-1 max-w-[100px]'
                )}
              >
                {content}
              </button>
            );
          }

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
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
