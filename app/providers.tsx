'use client';

import { SessionProvider } from 'next-auth/react';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ServiceWorkerRegistration />
      {children}
    </SessionProvider>
  );
}

