'use client';

import { Megaphone, Calendar, User, ArrowRight, AlertCircle, Pin, Clock, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
  author_name: string;
  target_role: string;
  created_by?: number;
}

const getRoleColor = (role: string) => {
  switch (role.toLowerCase()) {
    case 'dean': return 'text-orange-700 bg-orange-100 border-orange-200';
    case 'chair': return 'text-blue-700 bg-blue-100 border-blue-200';
    case 'faculty': return 'text-green-700 bg-green-100 border-green-200';
    default: return 'text-gray-700 bg-gray-100 border-gray-200';
  }
};

const getRoleGradient = (role: string) => {
  switch (role.toLowerCase()) {
    case 'dean': return 'from-orange-500 to-orange-600';
    case 'chair': return 'from-blue-400 to-blue-600';
    case 'faculty': return 'from-green-400 to-green-600';
    default: return 'from-gray-400 to-gray-600';
  }
};

type RawAnnouncement = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  target_role: string | null;
  created_by: number;
  user?: { first_name?: string | null; last_name?: string | null } | null;
};

export default function AnnouncementList({ limit }: { limit?: number }) {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = useCallback(async () => {
    let query = supabase
      .from('announcements')
      .select(`
        id,
        title,
        content,
        created_at,
        target_role,
        created_by,
        user:created_by ( first_name, last_name )
      `)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching announcements:', error);
    } else if (data) {
      const formattedData = (data as RawAnnouncement[]).map((ann) => ({
        id: ann.id,
        title: ann.title,
        content: ann.content,
        created_at: new Date(ann.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        author_name: `${ann.user?.first_name || ''} ${ann.user?.last_name || ''}`.trim() || 'System',
        target_role: ann.target_role || 'All',
        created_by: ann.created_by,
      }));
      setAnnouncements(formattedData);
    }
    setLoading(false);
  }, [limit]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      setAnnouncements(prev => prev.filter(ann => ann.id !== id));
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Failed to delete announcement');
    }
  };

  useEffect(() => {
    fetchAnnouncements();

    // Real-time subscription for announcements
    const channel = supabase
      .channel('announcements_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
        },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAnnouncements]);

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(limit || 3)].map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="h-6 w-20 bg-gray-100 rounded-full"></div>
              <div className="h-4 w-24 bg-gray-100 rounded-full"></div>
            </div>
            <div className="h-6 w-3/4 bg-gray-100 rounded-full mb-3"></div>
            <div className="h-4 w-full bg-gray-100 rounded-full mb-2"></div>
            <div className="h-4 w-5/6 bg-gray-100 rounded-full mb-6"></div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100"></div>
                <div className="h-4 w-20 bg-gray-100 rounded-full"></div>
              </div>
              <div className="h-5 w-24 bg-gray-100 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {announcements.length === 0 && !loading && (
        <div className="text-center p-12 bg-gray-50 border border-gray-200 border-dashed rounded-2xl">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Megaphone className="w-6 h-6 text-gray-300" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 mb-1">No announcements</h3>
          <p className="text-xs text-gray-500">There are currently no announcements to display.</p>
        </div>
      )}
      
      {announcements.map((ann, index) => (
        <div 
          key={ann.id} 
          className="group bg-white rounded-2xl p-6 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 relative overflow-hidden animate-in slide-in-from-bottom-4 border border-gray-100"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Decorative Background Element */}
          <div className={`absolute -right-12 -top-12 w-40 h-40 bg-gradient-to-br ${getRoleGradient(ann.target_role)} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity duration-500`}></div>
          
          {/* Subtle left accent line */}
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${getRoleGradient(ann.target_role)} opacity-80`}></div>
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5 relative z-10">
            <div className="flex gap-4 items-start">
              {/* Author Initial / Avatar */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm border ${getRoleColor(ann.target_role)}`}>
                {ann.author_name.charAt(0)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">{ann.title}</h3>
                  {ann.target_role !== 'All' && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getRoleColor(ann.target_role)}`}>
                      {ann.target_role} Only
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
                  <span className="flex items-center gap-1.5 text-gray-700">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    {ann.author_name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {ann.created_at}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Optional Pin Icon for important look or Delete Icon */}
            <div className="flex gap-2 text-gray-200 transition-colors">
              {user && (user.role === 'admin' || user.role === 'dean' || user.id === String(ann.created_by)) && (
                <button 
                  onClick={() => handleDelete(ann.id)}
                  className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Delete Announcement"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <Pin className="w-5 h-5 -rotate-45 hidden md:block group-hover:text-gray-300" />
            </div>
          </div>
          
          <div className="pl-0 md:pl-16 relative z-10">
            <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100/50">
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {ann.content}
              </p>
            </div>
          </div>
        </div>
      ))}
      
      {limit && announcements.length >= limit && (
        <div className="text-center pt-4">
          <Link 
            href="/dean/announcement" 
            className="text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors inline-flex items-center gap-2 px-4 py-2 rounded-full hover:bg-gray-100"
          >
            View All Announcements
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
