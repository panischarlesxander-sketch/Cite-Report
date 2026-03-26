'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { UserRole } from '@/lib/auth';
import { 
  LayoutDashboard,
  LogOut, 
  User, 
  Menu,
  X,
  ShieldCheck,
  GraduationCap,
  Users,
  UserCog,
  FileText,
  Calendar,
  Megaphone,
  ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  title: string;
}

export default function DashboardLayout({ children, allowedRoles, title }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-500 mt-2">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'dean': return <ShieldCheck className="w-5 h-5" />;
      case 'chair': return <GraduationCap className="w-5 h-5" />;
      case 'faculty': return <Users className="w-5 h-5" />;
      case 'admin': return <UserCog className="w-5 h-5" />;
      default: return <User className="w-5 h-5" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'dean': return 'from-orange-500 to-orange-600';
      case 'chair': return 'from-orange-500 to-orange-600';
      case 'faculty': return 'from-orange-500 to-orange-600';
      case 'admin': return 'from-orange-500 to-orange-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'dean': return 'Dean';
      case 'chair': return 'Dept Chair';
      case 'faculty': return 'Faculty';
      case 'admin': return 'Admin';
      default: return role;
    }
  };

  const navItems = user.role === 'admin'
    ? [
        { name: 'Users', icon: Users, href: '/admin/users' },
        { name: 'Reports', icon: FileText, href: '/admin/reports' },
        { name: 'WFH', icon: Calendar, href: '/admin/wfh' },
        { name: 'Announcement', icon: Megaphone, href: '/admin/announcement' },
      ]
    : [
        { name: 'Dashboard', icon: LayoutDashboard, href: `/${user.role}/dashboard` },
      ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-[72px]'} bg-gradient-to-b from-gray-900 via-gray-900 to-orange-950 transition-all duration-300 ease-in-out hidden md:flex flex-col z-30 shadow-2xl flex-shrink-0`}
      >
        {/* Logo */}
        <div className={`h-16 flex items-center ${isSidebarOpen ? 'px-5 gap-3' : 'justify-center px-2'} border-b border-white/10 flex-shrink-0`}>
          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-300">
            <img src="/CITE.png" alt="CITE" className="w-10 h-10 object-contain" />
          </div>
          {isSidebarOpen && (
            <div>
              <p className="text-white font-bold text-sm leading-tight">CITE Portal</p>
              <p className="text-gray-400 text-[11px] font-medium">Management System</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                title={!isSidebarOpen ? item.name : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-white text-orange-600 font-bold shadow-lg shadow-black/20'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  isActive ? 'text-orange-600' : 'text-gray-500 group-hover:text-white'
                }`} />
                {isSidebarOpen && <span className="text-sm truncate">{item.name}</span>}
                {isActive && isSidebarOpen && (
                  <ChevronRight className="ml-auto w-4 h-4 text-orange-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-white/10 space-y-2 flex-shrink-0">
          {isSidebarOpen ? (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getRoleColor(user.role)} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                {getRoleIcon(user.role)}
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate leading-none">{user.name}</p>
                <p className="text-gray-400 text-[11px] mt-0.5 font-medium uppercase tracking-wider">{getRoleLabel(user.role)}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getRoleColor(user.role)} flex items-center justify-center text-white`}>
                {getRoleIcon(user.role)}
              </div>
            </div>
          )}
          <button
            onClick={() => { logout(); router.push('/login'); }}
            className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-3' : 'justify-center'} py-2.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all text-sm font-medium`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {isSidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 z-20 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 md:flex hidden transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${getRoleColor(user.role)} text-white shadow-sm`}>
              {getRoleIcon(user.role)}
              <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">{getRoleLabel(user.role)}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
