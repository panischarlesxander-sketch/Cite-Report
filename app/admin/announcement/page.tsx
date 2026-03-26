'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Megaphone, Plus, X, Send } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  role: string | null;
  created_at: string;
}

function AnnouncementList() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setItems(data || []);
      } catch (error) {
        console.error('Failed to load announcements', error);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="relative w-10 h-10 mx-auto mb-3">
          <div className="absolute inset-0 border-4 border-orange-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-500 font-medium">Loading announcements...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-16 text-center">
        <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Megaphone className="w-8 h-8 text-orange-400" />
        </div>
        <p className="text-gray-600 font-semibold">No announcements yet.</p>
        <p className="text-sm text-gray-500 mt-1">Create your first announcement to get started.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {items.map((a) => (
        <li key={a.id} className="p-6 hover:bg-gray-50/50 transition-all rounded-lg -mx-2 px-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h4 className="text-gray-900 font-bold text-base mb-2">{a.title}</h4>
              <p className="text-gray-600 leading-relaxed">{a.content}</p>
              {a.role && (
                <span className="inline-block mt-3 px-3 py-1 bg-orange-50 text-orange-700 text-xs font-semibold rounded-full border border-orange-100">
                  {a.role}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
              {new Date(a.created_at).toLocaleString()}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AdminAnnouncementPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [role, setRole] = useState<'all' | 'faculty' | 'chair' | 'dean' | 'admin'>('all');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    try {
      setLoading(true);
      const { error } = await supabase.from('announcements').insert([
        { title, content, role: role === 'all' ? null : role }
      ]);
      if (error) throw error;
      setTitle('');
      setContent('');
      setRole('all');
      setShowForm(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to post: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['admin']} title="Announcements">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">Create and broadcast important notices to users</p>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 font-semibold text-sm ${showForm ? 'btn-soft' : 'btn-primary-soft'}`}
          >
            {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> New Announcement</>}
          </button>
        </div>

        {showForm && (
          <div className="card-soft overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create New Announcement</h3>
                <p className="text-orange-100 text-xs mt-0.5">Fill in the details below to broadcast</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="input-soft"
                    placeholder="Enter a concise title..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Target Role</label>
                  <select
                    value={role}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const val = e.target.value as 'all' | 'faculty' | 'chair' | 'dean' | 'admin';
                      setRole(val);
                    }}
                    className="input-soft cursor-pointer"
                  >
                    <option value="all">All Roles</option>
                    <option value="faculty">Faculty</option>
                    <option value="chair">Department Chairs</option>
                    <option value="dean">Dean</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Content</label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  className="input-soft resize-none"
                  placeholder="Type your announcement..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowForm(false)} className="btn-soft px-5 py-2.5">Discard</button>
                <button type="submit" disabled={loading} className="btn-primary-soft px-6 py-2.5 gap-2">
                  {loading ? 'Posting...' : <><Send className="w-4 h-4" /> Publish</>}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Megaphone className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Recent Broadcasts</h2>
          </div>
          <div className="p-2">
            <AnnouncementList />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
