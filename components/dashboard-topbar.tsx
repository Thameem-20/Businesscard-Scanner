'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Building2, LogOut, User, Settings } from 'lucide-react';
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
    <header className="fixed md:sticky top-0 z-40 w-full border-b border-gray-200 bg-white shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left side - Logo/Title for mobile, empty on desktop (sidebar has logo) */}
        <div className="flex items-center space-x-3 md:hidden">
          <Building2 className="h-6 w-6 text-indigo-600" />
          <span className="font-bold text-lg text-gray-900">{pageTitle}</span>
        </div>
        
        <div className="hidden md:flex items-center">
          <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
        </div>

        {/* Right side - User menu */}
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-3 h-10 px-3 hover:bg-gray-100"
              >
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-900">
                    {session?.user?.name || 'User'}
                  </span>
                  <span className="text-xs text-gray-500 truncate max-w-[150px]">
                    {session?.user?.email}
                  </span>
                </div>
                <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-indigo-600" />
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

