'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Scan, CreditCard, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
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
    <div className="p-6 md:p-8 h-full w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {session.user?.name}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-indigo-300" onClick={() => router.push('/dashboard/scan')}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Scan className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <CardTitle>Scan Card</CardTitle>
            <CardDescription>Upload or capture a business card</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-indigo-300" onClick={() => router.push('/dashboard/cards')}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <CardTitle>My Cards</CardTitle>
            <CardDescription>View all your business cards</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-indigo-300" onClick={() => router.push('/dashboard/users')}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <CardTitle>My Team</CardTitle>
            <CardDescription>Manage team members</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

