'use client';

import DeanLayout from '@/components/DeanLayout';
import AnnouncementList from '@/components/AnnouncementList';
import { Megaphone, Plus, X, Send } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export default function DeanAnnouncementPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState('All');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !content) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('announcements')
        .insert({
          title,
          content,
          created_by: user.id,
          target_role: targetRole,
          is_active: true
        });

      if (error) throw error;

      setTitle('');
      setContent('');
      setTargetRole('All');
      setShowForm(false);
      alert('Announcement posted successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error posting announcement:', error);
      alert(`Failed to post announcement: ${message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <DeanLayout title="Announcements">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-gray-500 text-sm">Create and manage official notices for faculty and staff.</p>
          </div>
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
            <form className="p-6 space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Title</label>
                  <input
                    type="text"
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
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="input-soft cursor-pointer"
                  >
                    <option value="All">All Roles (College-wide)</option>
                    <option value="faculty">Faculty Only</option>
                    <option value="chair">Department Chairs Only</option>
                    <option value="dean">Dean&apos;s Office Only</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Message Content</label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  className="input-soft resize-none"
                  placeholder="Type the full announcement message here..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowForm(false)} className="btn-soft px-5 py-2.5">Discard</button>
                <button type="submit" disabled={loading} className="btn-primary-soft px-6 py-2.5 gap-2">
                  {loading ? 'Posting...' : <><Send className="w-4 h-4" /> Broadcast Now</>}
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
    </DeanLayout>
  );
}
