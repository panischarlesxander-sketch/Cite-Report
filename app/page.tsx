'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user) {
      switch (user.role) {
        case 'dean':
          router.push('/dean/dashboard');
          break;
        case 'chair':
          router.push('/chair/dashboard');
          break;
        case 'faculty':
          router.push('/faculty/dashboard');
          break;
        case 'admin':
          router.push('/admin/dashboard');
          break;
        default:
          router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/40">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading CITE Portal</h2>
        <p className="text-sm text-gray-500">Please wait while we prepare your dashboard...</p>
      </div>
    </div>
  );
}
