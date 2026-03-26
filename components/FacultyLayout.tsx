'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { 
  LogOut, 
  Search,
  Menu,
  X,
  Home,
  Clock,
  UserCheck,
  User
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface FacultyLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function FacultyLayout({ children, title }: FacultyLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const roleLabel = user?.position || 'Faculty';

  useEffect(() => {
    if (!user || user.role !== 'faculty') {
      router.push('/login');
    }
  }, [user, router]);

  // Render a loading state or null while the effect runs
  if (!user || user.role !== 'faculty') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Verifying Access...</h2>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Home', icon: Home, href: '/faculty/dashboard' },
    { name: 'WFH', icon: Clock, href: '/faculty/wfh' },
    { name: 'E-Signature', icon: UserCheck, href: '/faculty/faculty' },
    { name: 'Profile', icon: User, href: '/faculty/profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col print:bg-white font-sans">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 print:hidden shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-6">
              <Link href="/faculty/dashboard" className="flex items-center gap-2.5">
                <div className="w-12 h-12 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center shadow-sm">
                  <img src="/CITE.png" alt="CITE" className="w-9 h-9 object-contain" />
                </div>
                <span className="font-bold text-gray-900 text-sm hidden sm:block">CITE Portal</span>
              </Link>
              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-gray-900 leading-none">{user.name}</p>
                  <p className="text-[11px] text-orange-600 mt-0.5 font-semibold uppercase tracking-wider">{roleLabel}</p>
                </div>
                <button
                  onClick={() => { logout(); router.push('/login'); }}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white hover:from-red-500 hover:to-red-600 transition-all shadow-sm"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 md:hidden transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-3 px-4 space-y-1 shadow-lg">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 print:p-0 print:m-0">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 print:p-0 print:m-0">
          {children}
        </div>
      </main>
    </div>
  );
}
