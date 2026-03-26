'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Eye, Clock, FileText, CheckCircle2, X, X as CloseIcon } from 'lucide-react';

interface ReportRow {
  id: string;
  faculty_name: string | null;
  department: string | null;
  report_date: string;
  status: 'Pending' | 'Reviewed' | 'Approved' | 'Rejected' | string;
}

type WFHEntry = { id: string } & Record<string, unknown>;
type ReportDetail = ReportRow & {
  wfh_entries?: WFHEntry[];
  [key: string]: unknown;
};

export default function AdminWFHPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Reviewed' | 'Approved' | 'Rejected'>('All');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<ReportDetail | null>(null);

  const fetchReports = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const { data, error } = await supabase
        .from('wfh_reports')
        .select('id, faculty_name, department, report_date, status')
        .order('report_date', { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Failed loading WFH reports', error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();

    const channel = supabase
      .channel('admin_wfh_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wfh_reports' },
        () => {
          fetchReports(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      setDrawerOpen(true);
      setSelected(null);
      const { data: report, error } = await supabase
        .from('wfh_reports')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      const { data: entriesData, error: entriesError } = await supabase
        .from('wfh_entries')
        .select('*')
        .eq('report_id', id)
        .order('id');
      if (entriesError) throw entriesError;
      const entries = (entriesData || []) as WFHEntry[];

      let allAccomplishments: Record<string, unknown>[] = [];
      let allIssues: Record<string, unknown>[] = [];
      let allItems: Record<string, unknown>[] = [];
      let allItemBullets: Record<string, unknown>[] = [];

      if (entries.length > 0) {
        const entryIds = entries.map(e => e.id);

        const { data: acc, error: accErr } = await supabase
          .from('wfh_accomplishments')
          .select('*')
          .in('entry_id', entryIds);
        if (accErr) throw accErr;
        allAccomplishments = acc || [];

        const { data: issues, error: issErr } = await supabase
          .from('wfh_issues')
          .select('*')
          .in('entry_id', entryIds);
        if (issErr) throw issErr;
        allIssues = issues || [];

        const { data: items, error: itemsErr } = await supabase
          .from('wfh_instruction_items')
          .select('*')
          .in('entry_id', entryIds);
        if (itemsErr) throw itemsErr;
        allItems = items || [];

        if (allItems.length > 0) {
          const itemIds = allItems.map(i => i.id);
          const { data: bullets, error: bulletsErr } = await supabase
            .from('wfh_instruction_bullets')
            .select('*')
            .in('item_id', itemIds);
          if (bulletsErr) throw bulletsErr;
          allItemBullets = bullets || [];
        }
      }

      const fullEntries = entries.map(entry => {
        const entryAccomplishments = allAccomplishments.filter(b => b.entry_id === entry.id);
        const entryIssues = allIssues.filter(b => b.entry_id === entry.id);
        const entryItems = allItems.filter(i => i.entry_id === entry.id);
        const fullItems = entryItems.map(item => ({
          ...item,
          wfh_instruction_bullets: allItemBullets.filter(b => b.item_id === item.id)
        }));
        return {
          ...entry,
          wfh_accomplishments: entryAccomplishments,
          wfh_issues: entryIssues,
          wfh_instruction_items: fullItems
        };
      });

      const detail: ReportDetail = {
        ...(report as ReportDetail),
        wfh_entries: fullEntries
      };
      setSelected(detail);
    } catch (e) {
      console.error('Failed to load detail', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const exportCSV = () => {
    const header = ['Faculty','Department','Date','Status'];
    const rows = filtered.map(r => [
      r.faculty_name ?? '',
      r.department ?? '',
      new Date(r.report_date).toISOString().slice(0,10),
      r.status
    ]);
    const csv = [header, ...rows].map(cols => cols.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wfh_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'Pending').length,
    reviewed: reports.filter(r => r.status === 'Reviewed').length,
    approved: reports.filter(r => r.status === 'Approved').length,
    rejected: reports.filter(r => r.status === 'Rejected').length,
  };

  const summary = [
    { label: 'Total', value: stats.total, icon: FileText, gradient: 'from-gray-600 to-gray-700', shadow: 'shadow-gray-400/25' },
    { label: 'Pending', value: stats.pending + stats.reviewed, icon: Clock, gradient: 'from-amber-400 to-amber-500', shadow: 'shadow-amber-400/25' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle2, gradient: 'from-green-500 to-green-600', shadow: 'shadow-green-500/25' },
    { label: 'Rejected', value: stats.rejected, icon: X, gradient: 'from-red-500 to-red-600', shadow: 'shadow-red-500/25' },
  ];

  const filtered = reports.filter(r => activeTab === 'All' ? true : r.status === activeTab || (activeTab === 'Pending' && r.status === 'Reviewed'));

  const statusPill = (s: string) => {
    switch (s) {
      case 'Approved': return 'bg-green-50 text-green-700';
      case 'Reviewed': return 'bg-blue-50 text-blue-700';
      case 'Rejected': return 'bg-red-50 text-red-700';
      default: return 'bg-amber-50 text-amber-700';
    }
  };

  return (
    <DashboardLayout allowedRoles={['admin']} title="WFH Overview">
      <div className="space-y-6 relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summary.map((card) => (
            <div key={card.label} className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-white shadow-lg ${card.shadow} hover:shadow-xl hover:scale-[1.02] transition-all duration-200`}>
              <div className="flex items-center justify-between mb-3">
                <div className="bg-white/20 rounded-xl p-2 border border-white/20">
                  <card.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold">{card.value}</p>
              <p className="text-white/80 text-xs mt-0.5 font-medium">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 p-1 bg-white border border-gray-200 rounded-xl w-fit shadow-sm">
          {(['All', 'Pending', 'Reviewed', 'Approved', 'Rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab}
              <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${
                activeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab === 'All' ? stats.total :
                  tab === 'Pending' ? (stats.pending + stats.reviewed) :
                  tab === 'Reviewed' ? stats.reviewed :
                  tab === 'Approved' ? stats.approved : stats.rejected}
              </span>
            </button>
          ))}
          <button
            onClick={exportCSV}
            className="ml-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-semibold"
            title="Export CSV"
          >
            Export CSV
          </button>
        </div>

        <div className="card-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{activeTab === 'All' ? 'WFH Reports' : `${activeTab} Reports`}</h2>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-10 h-10 border-4 border-gray-200 border-top-orange-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center text-gray-500">No reports found.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Faculty</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900">{r.faculty_name || '—'}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{r.department || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(r.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusPill(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openDetail(r.id)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all" title="View">
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {drawerOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-orange-100/30" onClick={() => setDrawerOpen(false)} />
            <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white border-l border-orange-200 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-orange-900">Report Details</h3>
                <button onClick={() => setDrawerOpen(false)} className="p-2 text-orange-500 hover:text-orange-700 rounded-lg hover:bg-orange-50">
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>
              {detailLoading || !selected ? (
                <div className="p-8 text-center text-orange-500">Loading...</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-orange-500">Faculty</p>
                    <p className="text-sm font-semibold text-orange-900">{selected.faculty_name || '—'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-orange-500">Department</p>
                      <p className="text-sm font-semibold text-orange-900">{selected.department || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-orange-500">Date</p>
                      <p className="text-sm font-semibold text-orange-900">{new Date(selected.report_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-orange-500">Status</p>
                    <p className="text-sm font-semibold text-orange-900">{selected.status}</p>
                  </div>
                  {selected.wfh_entries && selected.wfh_entries.length > 0 && (() => {
                    type Bullet = { id: number | string; content: string };
                    type Item = { id: number | string; title: string; wfh_instruction_bullets?: Bullet[] };
                    type FullEntry = {
                      id: string | number;
                      section?: string | null;
                      title?: string | null;
                      entry_date?: string | null;
                      wfh_instruction_items?: Item[];
                      wfh_accomplishments?: Bullet[];
                      wfh_issues?: Bullet[];
                    };
                    const entries = selected.wfh_entries as FullEntry[];
                    const bySection = new Map<string, FullEntry[]>();
                    entries.forEach((e) => {
                      const sec = (e.section || 'General').toString();
                      const list = bySection.get(sec) || [];
                      list.push(e);
                      bySection.set(sec, list);
                    });
                    const order = ['A', 'B', 'C'];
                    const orderedSections = Array.from(bySection.entries()).sort((a, b) => {
                      const ia = order.indexOf(a[0]); const ib = order.indexOf(b[0]);
                      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
                    });
                    return (
                      <div className="space-y-6">
                        {orderedSections.map(([sec, list]) => (
                          <div key={sec}>
                            <div className="text-xs font-bold text-orange-600 mb-2">{sec === 'A' ? 'A. Instruction' : sec === 'B' ? 'B. Designation (if applicable)' : sec === 'C' ? 'C. Research, Extension and Production' : sec}</div>
                            <div className="overflow-x-auto">
                              <table className="w-full border-2 border-orange-200 text-[12px]">
                                <thead>
                                  <tr className="bg-orange-50">
                                    <th className="border-2 border-orange-200 p-1 text-left w-1/3">Instruction / Title</th>
                                    <th className="border-2 border-orange-200 p-1 text-center w-28">Date</th>
                                    <th className="border-2 border-orange-200 p-1 text-left">Accomplishment</th>
                                    <th className="border-2 border-orange-200 p-1 text-left">Issues/Concerns</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {list.map((e) => (
                                    <tr key={String(e.id)}>
                                      <td className="border-2 border-orange-200 p-1 align-top">
                                        <div className="space-y-1">
                                          {e.title && <div className="font-medium">{e.title}</div>}
                                          {e.wfh_instruction_items?.map((it) => (
                                            <div key={String(it.id)}>
                                              <div className="font-semibold text-[12px]">{it.title}</div>
                                              {it.wfh_instruction_bullets && it.wfh_instruction_bullets.length > 0 && (
                                                <ul className="list-disc pl-5">
                                                  {it.wfh_instruction_bullets.map((b) => (
                                                    <li key={String(b.id)}>{b.content}</li>
                                                  ))}
                                                </ul>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="border-2 border-orange-200 p-1 align-top text-center">
                                        {e.entry_date ? new Date(e.entry_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
                                      </td>
                                      <td className="border-2 border-orange-200 p-1 align-top">
                                        <ul className="list-disc pl-5">
                                          {(e.wfh_accomplishments || []).map((a) => (
                                            <li key={String(a.id)}>{a.content}</li>
                                          ))}
                                        </ul>
                                      </td>
                                      <td className="border-2 border-orange-200 p-1 align-top">
                                        <ul className="list-disc pl-5">
                                          {(e.wfh_issues || []).map((i) => (
                                            <li key={String(i.id)}>{i.content}</li>
                                          ))}
                                        </ul>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
