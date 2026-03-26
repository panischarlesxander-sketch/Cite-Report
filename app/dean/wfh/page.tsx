'use client';

import DeanLayout from '@/components/DeanLayout';
import { Clock, CheckCircle2, User, FileText, X, Eye, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import WFHAccomplishmentForm from '@/components/WFHAccomplishmentForm';
import { useAuth } from '@/lib/AuthContext';
import Portal from '@/components/Portal';
import LottiePlayer from '@/components/LottiePlayer';

interface WFHReport {
  id: string;
  faculty_name: string;
  report_date: string;
  department: string;
  reviewed_date: string | null;
  approved_date: string | null;
  status: string;
  title?: string | null;
}

type WFHEntry = { id: string } & Record<string, unknown>;

type WFHReportFull = WFHReport & {
  wfh_entries?: WFHEntry[];
  [key: string]: unknown;
};

interface ApprovalData {
  footer_remarks_2?: string;
  signature_url?: string;
  approved_date?: string;
}

export default function DeanWFHPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<WFHReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<WFHReportFull | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [showReviewSuccess, setShowReviewSuccess] = useState(false);
  const [exitAfterSuccess, setExitAfterSuccess] = useState(false);

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
      console.error('Error fetching reports:', error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();

    // Real-time subscription for report updates
    const channel = supabase
      .channel('dean_wfh_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wfh_reports',
        },
        () => {
          fetchReports(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleViewReport = async (id: string) => {
    try {
      setLoading(true);
      
      // 1. Fetch Report
      const { data: report, error: reportError } = await supabase
        .from('wfh_reports')
        .select('*')
        .eq('id', id)
        .single();

      if (reportError) throw reportError;

      // 2. Fetch Entries
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

      if (entries && entries.length > 0) {
        const entryIds = entries.map(e => e.id);

        // 3. Fetch Accomplishments
        const { data: accomplishments, error: accError } = await supabase
          .from('wfh_accomplishments')
          .select('*')
          .in('entry_id', entryIds);
        
        if (accError) throw accError;
        allAccomplishments = accomplishments || [];

        // 4. Fetch Issues
        const { data: issues, error: issError } = await supabase
          .from('wfh_issues')
          .select('*')
          .in('entry_id', entryIds);
        
        if (issError) throw issError;
        allIssues = issues || [];

        // 5. Fetch Instruction Items
        const { data: items, error: itemsError } = await supabase
          .from('wfh_instruction_items')
          .select('*')
          .in('entry_id', entryIds);
        
        if (itemsError) throw itemsError;
        allItems = items || [];

        if (allItems.length > 0) {
          const itemIds = allItems.map(i => i.id);
          // 6. Fetch Instruction Bullets
          const { data: iBullets, error: iBulletsError } = await supabase
            .from('wfh_instruction_bullets')
            .select('*')
            .in('item_id', itemIds);
          
          if (iBulletsError) throw iBulletsError;
          allItemBullets = iBullets || [];
        }
      }

      // 7. Assemble Data Structure
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
      }) || [];

      const fullReport: WFHReportFull = {
        ...(report as WFHReportFull),
        wfh_entries: fullEntries
      };
      
      setSelectedReport(fullReport);
      setViewMode(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching report details:', error);
      alert(`Failed to load report: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (formData?: ApprovalData, reportId?: string) => {
    const idToUpdate = reportId || selectedReport?.id;
    if (!idToUpdate || !user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      
      const updateData: Record<string, unknown> = {
        status: 'Approved',
        approved_date: formData?.approved_date || today
      };
      
      if (formData?.footer_remarks_2) {
        updateData.footer_remarks_2 = formData.footer_remarks_2;
      }
      
      if (formData?.signature_url) {
        updateData.dean_signature = formData.signature_url;
      } else {
        // Fetch signature if not provided (e.g. inline approval)
        const { data: userData } = await supabase
          .from('user')
          .select('signature_url')
          .eq('id', user.id)
          .single();
        
        if (userData?.signature_url) {
          updateData.dean_signature = userData.signature_url;
        }
      }

      // 1. Update Report Status
      const { error: updateError } = await supabase
        .from('wfh_reports')
        .update(updateData)
        .eq('id', idToUpdate);

      if (updateError) throw updateError;

      // 2. Create Approval Record
      const { error: approvalError } = await supabase
        .from('wfh_approvals')
        .insert({
          report_id: idToUpdate,
          role: 'dean',
          name: user.name,
          approved: true,
          approved_at: now
        });

      if (approvalError) throw approvalError;

      setExitAfterSuccess(viewMode);
      setShowReviewSuccess(true);
      fetchReports();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error approving report:', error);
      alert(`Failed to approve report: ${message}`);
    }
  };

  const handleReject = async (reason: string, reportId?: string) => {
    const idToUpdate = reportId || selectedReport?.id;
    if (!idToUpdate || !user) return;
    
    try {
      const now = new Date().toISOString();
      const finalReason = reason || (reportId ? prompt("Enter rejection reason:") : "");
      
      if (reportId && !finalReason) return; // Cancelled prompt

      // 1. Update Report Status
      const { error: updateError } = await supabase
        .from('wfh_reports')
        .update({ 
          status: 'Rejected',
          rejection_reason: finalReason
        })
        .eq('id', idToUpdate);

      if (updateError) throw updateError;

      // 2. Create Rejection Record
      const { error: approvalError } = await supabase
        .from('wfh_approvals')
        .insert({
          report_id: idToUpdate,
          role: 'dean',
          name: user.name,
          approved: false,
          approved_at: now
        });

      if (approvalError) throw approvalError;
      
      alert('Report rejected.');
      if (viewMode) {
        setViewMode(false);
        setSelectedReport(null);
      }
      fetchReports();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error rejecting report:', error);
      alert(`Failed to reject report: ${message}`);
    }
  };

  const getStatus = (report: WFHReport) => {
    return report.status || 'Pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'text-green-600 bg-green-50';
      case 'Reviewed': return 'text-blue-600 bg-blue-50';
      case 'Rejected': return 'text-red-600 bg-red-50';
      default: return 'text-amber-600 bg-amber-50';
    }
  };

  const stats = {
    pending: reports.filter(r => getStatus(r) === 'Pending').length,
    reviewed: reports.filter(r => getStatus(r) === 'Reviewed').length,
    approved: reports.filter(r => getStatus(r) === 'Approved').length,
    rejected: reports.filter(r => getStatus(r) === 'Rejected').length,
    total: reports.length
  };

  const summaryCards = [
    { label: 'Total Reports', value: stats.total, icon: FileText, gradient: 'from-gray-600 to-gray-700', shadow: 'shadow-gray-400/25' },
    { label: 'Pending Review', value: stats.pending + stats.reviewed, icon: Clock, gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-400/25' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle2, gradient: 'from-green-500 to-green-600', shadow: 'shadow-green-500/25' },
    { label: 'Rejected', value: stats.rejected, icon: X, gradient: 'from-red-500 to-red-600', shadow: 'shadow-red-500/25' },
  ];

  if (viewMode && selectedReport) {
    return (
      <DeanLayout title="Review Report">
        <div className="mb-6 print:hidden">
              <button 
                onClick={() => { setViewMode(false); setSelectedReport(null); }}
                className="btn-soft px-4 py-2 flex items-center text-sm"
              >
            <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
            Back to Dashboard
          </button>
        </div>
        <WFHAccomplishmentForm 
          initialData={selectedReport} 
          readOnly={true} 
          userRole="dean"
          onApprove={handleApprove}
          onReject={handleReject}
          onExit={() => { setViewMode(false); setSelectedReport(null); }}
        />
        {showReviewSuccess && (
          <Portal>
            <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center print:hidden">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4">
                <div className="text-center space-y-2">
                  <LottiePlayer path="/check.json" loop={false} className="mx-auto w-28 h-28" name="dean-review-success" />
                  <h3 className="text-lg font-semibold text-slate-900">Report reviewed successfully!</h3>
                  <p className="text-sm text-slate-600">The status has been updated.</p>
                </div>
                <div className="mt-6 flex justify-center">
                  <button
                    className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium shadow-sm shadow-emerald-600/20"
                    onClick={() => {
                      setShowReviewSuccess(false);
                      if (exitAfterSuccess) {
                        setViewMode(false);
                        setSelectedReport(null);
                        setExitAfterSuccess(false);
                      }
                    }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </Portal>
        )}
      </DeanLayout>
    );
  }

  return (
    <DeanLayout title="WFH Reports" showMeta={false}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">WFH Accomplishment Reports</h2>
            <p className="text-gray-500 text-sm mt-1">Review submissions endorsed by department chairs and issue final decisions.</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 p-1 bg-white border border-gray-200 rounded-xl w-fit shadow-sm">
          {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab}
              <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${
                activeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {tab === 'All' 
                  ? reports.length 
                  : tab === 'Pending' ? (stats.pending + stats.reviewed)
                  : tab === 'Approved' ? stats.approved
                  : stats.rejected}
              </span>
            </button>
          ))}
        </div>

        {/* Requests Table */}
        <div className="card-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              {activeTab === 'All' ? 'Faculty WFH Requests' : `${activeTab} Reports`}
            </h2>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500 font-medium">Loading reports...</p>
              </div>
            ) : reports.filter(r => {
                if (activeTab === 'All') return true;
                if (activeTab === 'Pending') return getStatus(r) === 'Pending' || getStatus(r) === 'Reviewed';
                return getStatus(r) === activeTab;
              }).length === 0 ? (
              <div className="p-16 text-center">
                <LottiePlayer path="/nocontent.json" className="mx-auto w-44 h-44" name="dean-no-content" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {activeTab === 'All' ? 'No reports found' : `No ${activeTab.toLowerCase()} reports found`}
                </h3>
                <p className="text-gray-500 max-w-xs mx-auto">
                  {activeTab === 'All' 
                    ? "There are no WFH accomplishment reports submitted yet." 
                    : `There are no reports with ${activeTab.toLowerCase()} status at the moment.`}
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Faculty Member</th>
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reports
                    .filter(r => {
                      if (activeTab === 'All') return true;
                      if (activeTab === 'Pending') return getStatus(r) === 'Pending' || getStatus(r) === 'Reviewed';
                      return getStatus(r) === activeTab;
                    })
                    .map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold text-gray-900">{req.faculty_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-700 uppercase">{req.title || 'Untitled Report'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(req.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(getStatus(req))}`}>
                          {getStatus(req) === 'Pending' ? 'Waiting for Chair Approval' : getStatus(req) === 'Reviewed' ? 'Approved by Chair' : getStatus(req)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {getStatus(req) === 'Reviewed' && (
                            <>
                              <button 
                                onClick={() => handleApprove(undefined, req.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                title="Final Approval"
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => handleReject('', req.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Reject Report"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => handleViewReport(req.id)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      {showReviewSuccess && (
        <Portal>
          <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center print:hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4">
              <div className="text-center space-y-2">
                <LottiePlayer path="/check.json" loop={false} className="mx-auto w-28 h-28" name="dean-review-success" />
                <h3 className="text-lg font-semibold text-slate-900">Report reviewed successfully!</h3>
                <p className="text-sm text-slate-600">The status has been updated.</p>
              </div>
              <div className="mt-6 flex justify-center">
                <button
                  className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium shadow-sm shadow-emerald-600/20"
                  onClick={() => {
                    setShowReviewSuccess(false);
                    setExitAfterSuccess(false);
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </DeanLayout>
  );
}
