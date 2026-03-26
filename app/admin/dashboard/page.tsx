'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { Users, AlertTriangle, Activity, UserPlus, Settings, Shield, History, Database, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    users: 0,
    reports: 0,
    announcements: 0
  });

  const [recentActivity, setRecentActivity] = useState<{ id: string, action: string, target: string, time: string }[]>([]);

  useEffect(() => {
    const fetchStatsAndActivity = async () => {
      try {
        const [{ count: usersCount }, { count: reportsCount }, { count: announcementsCount }] = await Promise.all([
          supabase.from('user').select('*', { count: 'exact', head: true }),
          supabase.from('wfh_reports').select('*', { count: 'exact', head: true }),
          supabase.from('announcements').select('*', { count: 'exact', head: true })
        ]);

        setStats({
          users: usersCount || 0,
          reports: reportsCount || 0,
          announcements: announcementsCount || 0
        });

        // Fetch recent announcements for activity feed
        const { data: recentAnnouncements } = await supabase
          .from('announcements')
          .select('id, title, target_role, created_at')
          .order('created_at', { ascending: false })
          .limit(3);

        if (recentAnnouncements) {
          const formattedActivity = recentAnnouncements.map(ann => {
            const timeDiff = Math.floor((new Date().getTime() - new Date(ann.created_at).getTime()) / (1000 * 60 * 60)); // in hours
            const timeStr = timeDiff < 1 ? 'Just now' : timeDiff < 24 ? `${timeDiff} hours ago` : `${Math.floor(timeDiff/24)} days ago`;
            
            return {
              id: ann.id.toString(),
              action: 'posted a new announcement for',
              target: ann.target_role === 'All' ? 'Everyone' : ann.target_role,
              time: timeStr
            };
          });
          setRecentActivity(formattedActivity);
        }

      } catch (error) {
        console.error("Error fetching admin stats:", error);
      }
    };

    fetchStatsAndActivity();

    // Subscribe to changes across these tables
    const channel = supabase.channel('admin_dashboard_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user' }, fetchStatsAndActivity)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wfh_reports' }, fetchStatsAndActivity)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetchStatsAndActivity)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats.users, icon: Users, gradient: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-500/25', trend: 'Live' },
    { label: 'Total Reports', value: stats.reports, icon: FileText, gradient: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/25', trend: 'Live' },
    { label: 'Announcements', value: stats.announcements, icon: Activity, gradient: 'from-green-500 to-green-600', shadow: 'shadow-green-500/25', trend: 'Live' },
  ];

  const adminActions = [
    { title: 'User Management', icon: UserPlus, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', href: '/admin/users' },
    { title: 'System Settings', icon: Settings, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', href: '#' },
    { title: 'Role Management', icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', href: '#' },
    { title: 'System Logs', icon: History, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-100', href: '#' },
    { title: 'Database Backup', icon: Database, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', href: '#' },
  ];

  return (
    <DashboardLayout allowedRoles={['admin']} title="Overview">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {statCards.map((stat) => (
            <div key={stat.label} className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-6 text-white shadow-lg ${stat.shadow} hover:shadow-xl hover:scale-[1.02] transition-all duration-200`}>
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 rounded-xl p-2.5 backdrop-blur-sm border border-white/20">
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-bold border border-white/10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  {stat.trend}
                </span>
              </div>
              <h3 className="text-3xl font-extrabold">{stat.value}</h3>
              <p className="text-white/80 text-sm mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="card-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Settings className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Quick Actions</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {adminActions.map((action) => (
                <button
                  key={action.title}
                  onClick={() => action.href !== '#' && router.push(action.href)}
                  className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-orange-200 hover:bg-orange-50/40 transition-all duration-200 text-center active:scale-95 group"
                >
                  <div className={`w-11 h-11 rounded-xl ${action.bg} flex items-center justify-center ${action.color} border border-white/60 group-hover:scale-110 transition-transform duration-200`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 leading-tight">{action.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentActivity.length > 0 ? recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-orange-600">Admin</span> {activity.action} <span className="font-semibold capitalize">{activity.target}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
                </div>
              </div>
            )) : (
              <div className="px-6 py-8 text-center text-gray-500 text-sm">No recent activity</div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
