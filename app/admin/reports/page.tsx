'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Filter, Clock, Eye, X, FileText } from 'lucide-react';

interface ReportRow {
  id: string;
  user_id: string | null;
  faculty_name: string | null;
  department: string | null;
  report_date: string;
  status: 'Pending' | 'Reviewed' | 'Approved' | 'Rejected' | string;
  title?: string | null;
}

type WFHEntry = { id: string } & Record<string, unknown>;

type ReportDetail = ReportRow & {
  wfh_entries?: WFHEntry[];
  [key: string]: unknown;
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'All' | 'Pending' | 'Reviewed' | 'Approved' | 'Rejected'>('All');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<ReportDetail | null>(null);

  const fetchReports = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const { data, error } = await supabase
        .from('wfh_reports')
        .select('*')
        .order('report_date', { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports', error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();

    const channel = supabase
      .channel('admin_reports_realtime')
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
    const header = ['Faculty','Department','Title','Date','Status'];
    const rows = filtered.map(r => [
      r.faculty_name ?? '',
      r.department ?? '',
      r.title ?? '',
      new Date(r.report_date).toISOString().slice(0,10),
      r.status
    ]);
    const csv = [header, ...rows].map(cols => cols.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = reports.filter((r) => {
    const matchesStatus = status === 'All' ? true : r.status === status;
    const text = `${r.faculty_name ?? ''} ${r.department ?? ''} ${r.title ?? ''}`.toLowerCase();
    const matchesText = text.includes(search.toLowerCase());
    return matchesStatus && matchesText;
  });

  const statusPill = (s: string) => {
    switch (s) {
      case 'Approved': return 'bg-green-50 text-green-700';
      case 'Reviewed': return 'bg-blue-50 text-blue-700';
      case 'Rejected': return 'bg-red-50 text-red-700';
      default: return 'bg-amber-50 text-amber-700';
    }
  };

  return (
    <DashboardLayout allowedRoles={['admin']} title="All WFH Reports">
      <div className="space-y-6 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, department, or title..."
              className="input-soft pl-10"
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-500" />
            <div className="flex gap-2">
              {(['All', 'Pending', 'Reviewed', 'Approved', 'Rejected'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    status === s ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={exportCSV}
              className="ml-2 btn-soft px-5 py-2.5"
              title="Export CSV"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="card-soft overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">WFH Reports</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-16 text-center">
                <div className="relative w-12 h-12 mx-auto mb-4">
                  <div className="absolute inset-0 border-4 border-orange-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-gray-600 font-semibold">Loading reports...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Clock className="w-10 h-10 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No reports found</h3>
                <p className="text-gray-500 max-w-xs mx-auto">Try changing your filter or search query.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-50/50 text-gray-600 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 border-b-2 border-gray-100">Faculty</th>
                    <th className="px-6 py-4 border-b-2 border-gray-100">Department</th>
                    <th className="px-6 py-4 border-b-2 border-gray-100">Title</th>
                    <th className="px-6 py-4 border-b-2 border-gray-100">Date</th>
                    <th className="px-6 py-4 border-b-2 border-gray-100">Status</th>
                    <th className="px-6 py-4 text-right border-b-2 border-gray-100">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900">{r.faculty_name || '—'}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{r.department || '—'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-700">{r.title || 'Untitled Report'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                        {new Date(r.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${statusPill(r.status)} border`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openDetail(r.id)} className="p-2.5 text-orange-600 hover:bg-orange-50 rounded-xl transition-all shadow-sm hover:shadow-md border border-transparent hover:border-orange-100" title="View">
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
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
            <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white border-l border-gray-200 shadow-2xl overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5 flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Report Details</h3>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="p-2 text-orange-100 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                {detailLoading || !selected ? (
                  <div className="p-12 text-center">
                    <div className="relative w-12 h-12 mx-auto mb-4">
                      <div className="absolute inset-0 border-4 border-orange-100 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-gray-500 font-medium">Loading details...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Faculty</p>
                      <p className="text-base font-bold text-gray-900">{selected.faculty_name || '—'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Department</p>
                        <p className="text-sm font-bold text-gray-900">{selected.department || '—'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date</p>
                        <p className="text-sm font-bold text-gray-900">{new Date(selected.report_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</p>
                      <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold ${statusPill(selected.status)} border`}>
                        {selected.status}
                      </span>
                    </div>
                    {selected.title && (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Title</p>
                        <p className="text-sm font-medium text-gray-800">{selected.title}</p>
                      </div>
                    )}
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
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
