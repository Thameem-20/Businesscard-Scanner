'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Scan, CreditCard, Users, LogOut, Building2 } from 'lucide-react';

const menuItems = [
  {
    title: 'Scan Card',
    icon: Scan,
    href: '/dashboard/scan',
  },
  {
    title: 'My Cards',
    icon: CreditCard,
    href: '/dashboard/cards',
  },
  {
    title: 'My Team',
    icon: Users,
    href: '/dashboard/users',
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="h-full w-full flex flex-col border-r border-gray-200 bg-white">
      <div className="p-4 border-b border-gray-200 bg-indigo-600">
        <div className="flex items-center space-x-2">
          <Building2 className="h-6 w-6 text-white" />
          <span className="font-bold text-lg text-white">Card Scanner</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
            Navigation
          </div>
          <nav>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
