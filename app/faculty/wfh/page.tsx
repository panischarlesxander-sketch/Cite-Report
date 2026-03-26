"use client";

import FacultyLayout from "@/components/FacultyLayout";
import WFHAccomplishmentForm from "@/components/WFHAccomplishmentForm";
import ReportImageViewer from "@/components/ReportImageViewer";
import {
  Clock,
  Calendar,
  CheckCircle2,
  FileText,
  Plus,
  X,
  ChevronRight,
  Printer,
  ImageIcon,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import Portal from "@/components/Portal";
import LottiePlayer from "@/components/LottiePlayer";

interface WFHReport {
  id: string;
  report_date: string;
  title?: string;
  college: string;
  department: string;
  status: "Pending" | "Reviewed" | "Approved" | "Rejected";
  attachments?: string; // JSON string
}

type WFHEntry = { id: string } & Record<string, unknown>;

type WFHReportFull = WFHReport & {
  wfh_entries?: WFHEntry[];
  [key: string]: unknown;
};

export default function FacultyWFHPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [reports, setReports] = useState<WFHReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReport, setEditingReport] = useState<WFHReportFull | null>(
    null,
  );
  const [isViewMode, setIsViewMode] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Image Viewer State
  const [viewerImages, setViewerImages] = useState<string[] | null>(null);
  const [activeTab, setActiveTab] = useState<
    "All" | "Pending" | "Reviewed" | "Approved" | "Rejected"
  >("All");

  const fetchReports = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("wfh_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("report_date", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReports();

    // Real-time subscription for report updates
    if (!user) return;

    const channel = supabase
      .channel("faculty_wfh_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wfh_reports",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchReports();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReports, user]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (id: string) => {
    setReportToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;

    try {
      setIsDeleting(true);
      // 1. Fetch entries to get their IDs
      const { data: entries, error: entriesError } = await supabase
        .from("wfh_entries")
        .select("id")
        .eq("report_id", reportToDelete);

      if (entriesError) throw entriesError;

      if (entries && entries.length > 0) {
        const entryIds = entries.map(e => e.id);

        // 2. Fetch instruction items to get their IDs
        const { data: items } = await supabase
          .from("wfh_instruction_items")
          .select("id")
          .in("entry_id", entryIds);

        // 3. Delete instruction bullets FIRST (foreign key to instruction items)
        if (items && items.length > 0) {
          const itemIds = items.map(i => i.id);
          const { error: bulletsError } = await supabase.from("wfh_instruction_bullets").delete().in("item_id", itemIds);
          if (bulletsError) throw bulletsError;
        }

        // 4. Now we can safely delete instruction items, accomplishments, and issues
        const deletePromises = [
          supabase.from("wfh_instruction_items").delete().in("entry_id", entryIds),
          supabase.from("wfh_accomplishments").delete().in("entry_id", entryIds),
          supabase.from("wfh_issues").delete().in("entry_id", entryIds)
        ];
        
        const results = await Promise.all(deletePromises);
        for (const result of results) {
          if (result.error) throw result.error;
        }

        // 5. Finally delete the entries
        const { error: entriesDeleteError } = await supabase.from("wfh_entries").delete().eq("report_id", reportToDelete);
        if (entriesDeleteError) throw entriesDeleteError;
      }

      // 6. Finally delete the report itself
      const { error } = await supabase
        .from("wfh_reports")
        .delete()
        .eq("id", reportToDelete);

      if (error) {
        console.error("Supabase delete error:", error);
        throw new Error(
          error.message || "Unknown error occurred during deletion",
        );
      }

      setReports(reports.filter((r) => r.id !== reportToDelete));
      setShowDeleteModal(false);
      setShowDeleteSuccess(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Error deleting report:", error);
      alert(`Failed to delete report: ${message}`);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
      setReportToDelete(null);
    }
  };

  const handleEdit = async (id: string) => {
    try {
      setLoading(true);

      // 1. Fetch Report
      const { data: report, error: reportError } = await supabase
        .from("wfh_reports")
        .select("*")
        .eq("id", id)
        .single();

      if (reportError) throw reportError;

      // 2. Fetch Entries
      const { data: entriesData, error: entriesError } = await supabase
        .from("wfh_entries")
        .select("*")
        .eq("report_id", id)
        .order("id");

      if (entriesError) throw entriesError;

      const entries = (entriesData || []) as WFHEntry[];
      let allAccomplishments: Record<string, unknown>[] = [];
      let allIssues: Record<string, unknown>[] = [];
      let allItems: Record<string, unknown>[] = [];
      let allItemBullets: Record<string, unknown>[] = [];

      if (entries && entries.length > 0) {
        const entryIds = entries.map((e) => e.id);

        // 3. Fetch Accomplishments
        const { data: accomplishments, error: accError } = await supabase
          .from("wfh_accomplishments")
          .select("*")
          .in("entry_id", entryIds);

        if (accError) throw accError;
        allAccomplishments = accomplishments || [];

        // 4. Fetch Issues
        const { data: issues, error: issError } = await supabase
          .from("wfh_issues")
          .select("*")
          .in("entry_id", entryIds);

        if (issError) throw issError;
        allIssues = issues || [];

        // 5. Fetch Instruction Items
        const { data: items, error: itemsError } = await supabase
          .from("wfh_instruction_items")
          .select("*")
          .in("entry_id", entryIds);

        // Don't throw if table doesn't exist yet, just treat as empty (for smooth migration if needed)
        // But since we are fixing the schema, we should expect it to work.
        // However, if the user hasn't run the migration yet, this will fail.
        // We will catch the error in the main catch block.
        if (itemsError) throw itemsError;
        allItems = items || [];

        if (allItems.length > 0) {
          const itemIds = allItems.map((i) => i.id);
          // 6. Fetch Instruction Bullets
          const { data: iBullets, error: iBulletsError } = await supabase
            .from("wfh_instruction_bullets")
            .select("*")
            .in("item_id", itemIds);

          if (iBulletsError) throw iBulletsError;
          allItemBullets = iBullets || [];
        }
      }

      // 7. Assemble Data Structure
      const fullEntries =
        entries.map((entry) => {
          const entryAccomplishments = allAccomplishments.filter(
            (b) => b.entry_id === entry.id,
          );
          const entryIssues = allIssues.filter((b) => b.entry_id === entry.id);
          const entryItems = allItems.filter((i) => i.entry_id === entry.id);

          const fullItems = entryItems.map((item) => ({
            ...item,
            wfh_instruction_bullets: allItemBullets.filter(
              (b) => b.item_id === item.id,
            ),
          }));

          return {
            ...entry,
            wfh_accomplishments: entryAccomplishments,
            wfh_issues: entryIssues,
            wfh_instruction_items: fullItems,
          };
        }) || [];

      const fullReport: WFHReportFull = {
        ...(report as WFHReportFull),
        wfh_entries: fullEntries,
      };

      setEditingReport(fullReport);
      setIsViewMode(false); // Ensure view mode is off for editing
      setShowForm(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching report details:", error);
      alert(`Failed to load report for editing: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (id: string) => {
    try {
      setLoading(true);

      // 1. Fetch Report
      const { data: report, error: reportError } = await supabase
        .from("wfh_reports")
        .select("*")
        .eq("id", id)
        .single();

      if (reportError) throw reportError;

      // 2. Fetch Entries
      const { data: entriesData, error: entriesError } = await supabase
        .from("wfh_entries")
        .select("*")
        .eq("report_id", id)
        .order("id");

      if (entriesError) throw entriesError;

      const entries = (entriesData || []) as WFHEntry[];
      let allAccomplishments: Record<string, unknown>[] = [];
      let allIssues: Record<string, unknown>[] = [];
      let allItems: Record<string, unknown>[] = [];
      let allItemBullets: Record<string, unknown>[] = [];

      if (entries && entries.length > 0) {
        const entryIds = entries.map((e) => e.id);

        // 3. Fetch Accomplishments
        const { data: accomplishments, error: accError } = await supabase
          .from("wfh_accomplishments")
          .select("*")
          .in("entry_id", entryIds);

        if (accError) throw accError;
        allAccomplishments = accomplishments || [];

        // 4. Fetch Issues
        const { data: issues, error: issError } = await supabase
          .from("wfh_issues")
          .select("*")
          .in("entry_id", entryIds);

        if (issError) throw issError;
        allIssues = issues || [];

        // 5. Fetch Instruction Items
        const { data: items, error: itemsError } = await supabase
          .from("wfh_instruction_items")
          .select("*")
          .in("entry_id", entryIds);

        if (itemsError) {
          // Ignore error if table doesn't exist yet, but log it
          console.warn("Could not fetch instruction items", itemsError);
        }
        allItems = items || [];

        if (allItems.length > 0) {
          const itemIds = allItems.map((i) => i.id);
          // 6. Fetch Instruction Bullets
          const { data: iBullets, error: iBulletsError } = await supabase
            .from("wfh_instruction_bullets")
            .select("*")
            .in("item_id", itemIds);

          if (iBulletsError) throw iBulletsError;
          allItemBullets = iBullets || [];
        }
      }

      // 7. Assemble Data Structure
      const fullEntries =
        entries.map((entry) => {
          const entryAccomplishments = allAccomplishments.filter(
            (b) => b.entry_id === entry.id,
          );
          const entryIssues = allIssues.filter((b) => b.entry_id === entry.id);
          const entryItems = allItems.filter((i) => i.entry_id === entry.id);

          const fullItems = entryItems.map((item) => ({
            ...item,
            wfh_instruction_bullets: allItemBullets.filter(
              (b) => b.item_id === item.id,
            ),
          }));

          return {
            ...entry,
            wfh_accomplishments: entryAccomplishments,
            wfh_issues: entryIssues,
            wfh_instruction_items: fullItems,
          };
        }) || [];

      const fullReport: WFHReportFull = {
        ...(report as WFHReportFull),
        wfh_entries: fullEntries,
      };

      setEditingReport(fullReport);
      setIsViewMode(true);
      setShowForm(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching report details:", error);
      alert(`Failed to load report: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (id: string) => {
    try {
      setLoading(true);

      // 1. Fetch Report
      const { data: report, error: reportError } = await supabase
        .from("wfh_reports")
        .select("*")
        .eq("id", id)
        .single();

      if (reportError) throw reportError;

      // 2. Fetch Entries
      const { data: entriesData, error: entriesError } = await supabase
        .from("wfh_entries")
        .select("*")
        .eq("report_id", id)
        .order("id");

      if (entriesError) throw entriesError;

      const entries = (entriesData || []) as WFHEntry[];
      let allAccomplishments: Record<string, unknown>[] = [];
      let allIssues: Record<string, unknown>[] = [];
      let allItems: Record<string, unknown>[] = [];
      let allItemBullets: Record<string, unknown>[] = [];

      if (entries && entries.length > 0) {
        const entryIds = entries.map((e) => e.id);

        // 3. Fetch Accomplishments
        const { data: accomplishments, error: accError } = await supabase
          .from("wfh_accomplishments")
          .select("*")
          .in("entry_id", entryIds);

        if (accError) throw accError;
        allAccomplishments = accomplishments || [];

        // 4. Fetch Issues
        const { data: issues, error: issError } = await supabase
          .from("wfh_issues")
          .select("*")
          .in("entry_id", entryIds);

        if (issError) throw issError;
        allIssues = issues || [];

        // 5. Fetch Instruction Items
        const { data: items, error: itemsError } = await supabase
          .from("wfh_instruction_items")
          .select("*")
          .in("entry_id", entryIds);

        if (itemsError) {
          console.warn("Could not fetch instruction items", itemsError);
        }
        allItems = items || [];

        if (allItems.length > 0) {
          const itemIds = allItems.map((i) => i.id);
          // 6. Fetch Instruction Bullets
          const { data: iBullets, error: iBulletsError } = await supabase
            .from("wfh_instruction_bullets")
            .select("*")
            .in("item_id", itemIds);

          if (iBulletsError) throw iBulletsError;
          allItemBullets = iBullets || [];
        }
      }

      // 7. Assemble Data Structure
      const fullEntries =
        entries.map((entry) => {
          const entryAccomplishments = allAccomplishments.filter(
            (b) => b.entry_id === entry.id,
          );
          const entryIssues = allIssues.filter((b) => b.entry_id === entry.id);
          const entryItems = allItems.filter((i) => i.entry_id === entry.id);

          const fullItems = entryItems.map((item) => ({
            ...item,
            wfh_instruction_bullets: allItemBullets.filter(
              (b) => b.item_id === item.id,
            ),
          }));

          return {
            ...entry,
            wfh_accomplishments: entryAccomplishments,
            wfh_issues: entryIssues,
            wfh_instruction_items: fullItems,
          };
        }) || [];

      const fullReport: WFHReportFull = {
        ...(report as WFHReportFull),
        wfh_entries: fullEntries,
      };

      setEditingReport(fullReport);
      setIsViewMode(true);
      setShowForm(true);
      
      // Removed the direct isPrinting state update here because 
      // the print action will be handled by the user clicking 
      // the "Print PDF" button inside the WFHAccomplishmentForm.
      
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching report details:", error);
      alert(`Failed to load report for printing: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  // Removed the useEffect that handled printing on mount.
  // The print action is now triggered manually from inside the WFHAccomplishmentForm.

  const stats = {
    pending: reports.filter((r) => r.status === "Pending").length,
    approved: reports.filter((r) => r.status === "Approved").length,
    rejected: reports.filter((r) => r.status === "Rejected").length,
    total: reports.length,
  };

  if (showForm) {
    return (
      <FacultyLayout title="WFH Reports">
        <div className="mb-6 print:hidden">
          <button
            onClick={() => {
              setShowForm(false);
              setEditingReport(null);
              setIsViewMode(false);
            }}
            className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
            Back to Dashboard
          </button>
        </div>
        <WFHAccomplishmentForm
          initialData={editingReport}
          readOnly={isViewMode}
          onExit={() => {
            setShowForm(false);
            setEditingReport(null);
            setIsViewMode(false);
          }}
        />
      </FacultyLayout>
    );
  }

  return (
    <FacultyLayout title="WFH Reports">
      <div className="space-y-8 print:space-y-0 print:p-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
              WFH Accomplishment Reports
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Submit and track your Work From Home accomplishments.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingReport(null);
              setIsViewMode(false);
              setShowForm(true);
            }}
            className="btn-primary-soft py-2.5 px-5 gap-2"
          >
            <Plus className="w-4 h-4" /> New WFH Report
          </button>
        </div>


        {/* Conditional Rendering: Form or History */}
        {showForm ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 print:p-0 print:m-0">
            <WFHAccomplishmentForm 
              initialData={editingReport} 
              onExit={() => {
                setShowForm(false);
                setEditingReport(null);
                setIsViewMode(false);
              }}
            />
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500 print:hidden">
            <div className="flex flex-wrap items-center gap-2 p-1 bg-white border border-gray-200 rounded-xl w-fit shadow-sm">
              {(["All", "Pending", "Reviewed", "Approved", "Rejected"] as const).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                      activeTab === tab
                        ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md shadow-green-500/20"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {tab === "Reviewed" ? "Approved by Chair" : tab}
                    <span
                      className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${
                        activeTab === tab
                          ? "bg-white/20 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {tab === "All"
                        ? reports.length
                        : reports.filter((r) => r.status === tab).length}
                    </span>
                  </button>
                ),
              )}
            </div>

            {/* My Reports Table */}
            <div className="card-soft overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-white" />
                </div>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  {activeTab === "All" ? "All Submissions" : activeTab === "Reviewed" ? "Approved by Chair Reports" : `${activeTab} Reports`}
                </h2>
              </div>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-12 text-center">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">
                      Loading reports...
                    </p>
                  </div>
                ) : (
                  <>
                    {reports.filter(
                      (r) => activeTab === "All" || r.status === activeTab,
                    ).length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-6 py-4">Report Date</th>
                            <th className="px-6 py-4">Title</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {reports
                            .filter(
                              (r) =>
                                activeTab === "All" || r.status === activeTab,
                            )
                            .map((req) => (
                              <tr
                                key={req.id}
                                className="hover:bg-gray-50/50 transition-colors group"
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                                      <Calendar className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">
                                      {new Date(
                                        req.report_date,
                                      ).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-xs font-bold text-gray-700 uppercase">
                                    {req.title || "Untitled Report"}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                                      req.status === "Approved"
                                        ? "text-green-700 bg-green-50"
                                        : req.status === "Reviewed"
                                          ? "text-blue-700 bg-blue-50"
                                          : req.status === "Pending"
                                            ? "text-amber-700 bg-amber-50"
                                            : "text-red-700 bg-red-50"
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        req.status === "Approved"
                                          ? "bg-green-500"
                                          : req.status === "Reviewed"
                                            ? "bg-blue-500"
                                            : req.status === "Pending"
                                              ? "bg-amber-500"
                                              : "bg-red-500"
                                      }`}
                                    ></span>
                                    {req.status === "Reviewed" ? "Approved by Chair" : req.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {req.attachments &&
                                      JSON.parse(req.attachments).length >
                                        0 && (
                                        <button
                                          onClick={() =>
                                            setViewerImages(
                                              JSON.parse(req.attachments!),
                                            )
                                          }
                                          className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                          title="View Attachments"
                                        >
                                          <ImageIcon className="w-5 h-5" />
                                        </button>
                                      )}
                                    <button
                                      onClick={() => handleView(req.id)}
                                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                      title="View Details"
                                    >
                                      <Eye className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => handleEdit(req.id)}
                                      className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                      title="Edit Report"
                                    >
                                      <Pencil className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClick(req.id)}
                                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                      title="Delete Report"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-16 text-center">
                        <LottiePlayer path="/nocontent.json" className="mx-auto w-44 h-44" name="faculty-no-content" />
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {activeTab === "All"
                            ? "No reports found"
                            : activeTab === "Reviewed" ? "No approved by chair reports found" : `No ${activeTab.toLowerCase()} reports found`}
                        </h3>
                        <p className="text-gray-500 max-w-xs mx-auto">
                          {activeTab === "All"
                            ? "You have not submitted any WFH accomplishment reports yet."
                            : activeTab === "Reviewed" ? "There are no reports approved by the chair at the moment." : `There are no reports with ${activeTab.toLowerCase()} status at the moment.`}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Report Image Viewer Modal */}
        {viewerImages && (
          <ReportImageViewer
            images={viewerImages}
            onClose={() => setViewerImages(null)}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <Portal>
            <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center print:hidden">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4">
                <div className="text-center space-y-2">
                  <LottiePlayer path="/delete.json" className="mx-auto w-24 h-24" name="delete-warning" />
                  <h3 className="text-lg font-semibold text-slate-900">Delete Report</h3>
                  <p className="text-sm text-slate-600">
                    Are you sure you want to delete this report? This action cannot be undone.
                  </p>
                </div>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setReportToDelete(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium shadow-sm shadow-red-600/20 disabled:opacity-50"
                    onClick={confirmDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Report'}
                  </button>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* Delete Success Modal */}
        {showDeleteSuccess && (
          <Portal>
            <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center print:hidden">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4">
                <div className="text-center space-y-2">
                  <LottiePlayer path="/check.json" loop={false} className="mx-auto w-28 h-28" name="delete-success" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    Report deleted successfully
                  </h3>
                  <p className="text-sm text-slate-600">The report has been permanently removed.</p>
                </div>
                <div className="mt-6 flex justify-center">
                  <button 
                    className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium shadow-sm shadow-emerald-600/20"
                    onClick={() => setShowDeleteSuccess(false)}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </Portal>
        )}
      </div>
    </FacultyLayout>
  );
}
