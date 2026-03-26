'use client';

import ChairLayout from '@/components/ChairLayout';
import AnnouncementList from '@/components/AnnouncementList';
import { Megaphone, Clock, FileCheck, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ChairDashboard() {
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase
        .from('wfh_reports')
        .select('status');
        
      if (error) {
        console.error("Error fetching stats:", error);
        return;
      }

      if (data) {
        setStats({
          pending: data.filter(r => r.status === 'Pending').length,
          approved: data.filter(r => r.status === 'Reviewed').length,
          rejected: data.filter(r => r.status === 'Rejected').length
        });
      }
    };

    fetchStats();

    // Real-time subscription for report stats
    const channel = supabase
      .channel('chair_dashboard_stats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wfh_reports' },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const statCards = [
    { label: 'Pending Reviews', value: stats.pending, icon: Clock, gradient: 'from-amber-400 to-amber-500', shadow: 'shadow-amber-400/25' },
    { label: 'Approved Reports', value: stats.approved, icon: FileCheck, gradient: 'from-green-500 to-green-600', shadow: 'shadow-green-500/25' },
    { label: 'Rejected Reports', value: stats.rejected, icon: XCircle, gradient: 'from-red-500 to-red-600', shadow: 'shadow-red-500/25' },
  ];

  return (
    <ChairLayout title="Dashboard">
      <div className="space-y-6">

        {/* Top Action Bar removed per request */}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {statCards.map((stat, i) => (
            <div key={i} className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-6 text-white shadow-lg ${stat.shadow} hover:shadow-xl hover:scale-[1.02] transition-all duration-200`}>
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 rounded-xl p-2.5 backdrop-blur-sm border border-white/20">
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-3xl font-extrabold">{stat.value}</h3>
              <p className="text-white/80 text-sm mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Announcements */}
        <div className="card-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Megaphone className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Announcements</h2>
          </div>
          <div className="p-6">
            <AnnouncementList />
          </div>
        </div>

      </div>
    </ChairLayout>
  );
}
