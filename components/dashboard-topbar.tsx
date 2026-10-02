'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/scan': 'Scan Card',
  '/dashboard/cards': 'My Cards',
  '/dashboard/users': 'My Team',
  '/dashboard/settings': 'Settings',
};

export function DashboardTopbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const pageTitle = pageTitles[pathname] || 'Dashboard';

  return (
    <header className="fixed md:sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex h-14 md:h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center space-x-2 md:hidden">
          <span className="font-semibold text-[17px] tracking-tight text-slate-900">{pageTitle}</span>
        </div>
        
        <div className="hidden md:flex items-center">
          <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
        </div>

        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-3 h-9 w-9 md:h-10 md:w-auto md:px-3 p-0 hover:bg-gray-100 rounded-full"
              >
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-900">
                    {session?.user?.name || 'User'}
                  </span>
                  <span className="text-xs text-gray-500 truncate max-w-[150px]">
                    {session?.user?.email}
                  </span>
                </div>
                <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="h-4 w-4 md:h-5 md:w-5 text-indigo-600" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {session?.user?.name || 'User'}
                  </p>
                  <p className="text-xs leading-none text-gray-500 truncate">
                    {session?.user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-red-600 cursor-pointer focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

