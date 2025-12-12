'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { DashboardBottomNav } from '@/components/dashboard-bottom-nav';
import { DashboardTopbar } from '@/components/dashboard-topbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-screen bg-gray-50 w-full overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 flex-shrink-0 h-full overflow-hidden">
        <DashboardSidebar />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Bar */}
        <DashboardTopbar />

        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-0 pt-16 md:pt-0 w-full">
          <div className="h-full w-full">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden">
          <DashboardBottomNav />
        </div>
      </div>
    </div>
  );
}
