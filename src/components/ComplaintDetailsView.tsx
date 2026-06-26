/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, Clock, User, Phone, Mail, FileText, CheckCircle2, 
  AlertTriangle, ShieldAlert, PlusCircle, MessageSquare, History, 
  Briefcase, CornerDownRight, CheckSquare, Trash2 
} from "lucide-react";
import { Complaint, Note, Escalation, UserRole, ComplaintStatus, ComplaintPriority } from "../types";
import { SLACountdown } from "./DashboardView";

interface ComplaintDetailsViewProps {
  complaintId: string;
  currentUser: any;
  staffList: any[];
  onBack: () => void;
  onRefreshList: () => void | Promise<void>;
}

export default function ComplaintDetailsView({ 
  complaintId, 
  currentUser, 
  staffList, 
  onBack,
  onRefreshList
}: ComplaintDetailsViewProps) {
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Note textbox state
  const [newNoteText, setNewNoteText] = useState("");
  
  // Action console quick states
  const [quickStatus, setQuickStatus] = useState<string>("");
  const [quickStaff, setQuickStaff] = useState<string>("");
  const [quickPriority, setQuickPriority] = useState<string>("");

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("manivtha_auth_token");
      const res = await fetch(`/api/complaints/${complaintId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load ticket details.");
      }

      setComplaint(data.complaint);
      setNotes(data.notes);
      setEscalations(data.escalations);

      // Pre-fill action states
      setQuickStatus(data.complaint.status);
      setQuickStaff(data.complaint.assignedStaff);
      setQuickPriority(data.complaint.priority);

    } catch (err: any) {
      setError(err.message || "An occurred loading details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [complaintId]);

  // Submit Note Comment
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    setSubmittingNote(true);
    try {
      const token = localStorage.getItem("manivtha_auth_token");
      const res = await fetch(`/api/complaints/${complaintId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ note: newNoteText })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit comment.");
      }

      setNotes([...notes, data]);
      setNewNoteText("");
    } catch (err: any) {
      alert(err.message || "Failed to append comment.");
    } finally {
      setSubmittingNote(false);
    }
  };

  // Submit Quick Action Status/Staff Assignments
  const handleApplyActions = async () => {
    if (!complaint) return;
    setSubmittingAction(true);
    try {
      const token = localStorage.getItem("manivtha_auth_token");
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          status: quickStatus,
          assignedStaff: quickStaff,
          priority: quickPriority
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to edit complaint properties.");
      }

      setComplaint(data.complaint);
      setNotes(data.notes);
      onRefreshList();
      alert("Ticket properties updated successfully.");
    } catch (err: any) {
      alert(err.message || "Could not execute task.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Delete Complaint Ticket (all authorized users)
  const handleDeleteComplaint = async () => {
    try {
      const token = localStorage.getItem("manivtha_auth_token");
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete complaint.");
      }

      await onRefreshList();
      onBack();
    } catch (err: any) {
      alert(err.message || "Error dropping complaint.");
    }
  };

  // Compile full sorted timeline (Notes + Escalation breaches + Status logs + Creation block)
  const compileTimeline = () => {
    if (!complaint) return [];
    
    interface TimelineItem {
      id: string;
      type: "note" | "escalation" | "creation";
      title: string;
      description: string;
      time: string;
      author?: string;
      role?: string;
    }

    const items: TimelineItem[] = [];

    // 1. Creation Block
    items.push({
      id: "timeline-root",
      type: "creation",
      title: "Complaint Lodged",
      description: `Ticket created. SLA 4-hour countdown timer initiated immediately. Service category set to "${complaint.category}".`,
      time: complaint.createdAt
    });

    // 2. Escalations
    escalations.forEach((esc) => {
      items.push({
        id: esc.id,
        type: "escalation",
        title: "⚠️ SLA timer Breached (System Escalated)",
        description: esc.escalationReason,
        time: esc.escalationTime
      });
    });

    // 3. Notes (which include staff audits and status updates)
    notes.forEach((nt) => {
      items.push({
        id: nt.id,
        type: "note",
        title: nt.note.startsWith("🔧") || nt.note.startsWith("👤") || nt.note.startsWith("⚡")
          ? "System Audit Event"
          : "Agent Progress Note",
        description: nt.note,
        time: nt.createdAt,
        author: nt.userName,
        role: nt.role
      });
    });

    // Sort items chronologically
    return items.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400 shadow-xs">
        <Clock className="h-9 w-9 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">Collating operational records...</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Reviewing SLA timelines and logs</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-100 dark:border-red-950 p-8 text-center text-red-500 shadow-xs">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 dark:text-slate-200">Operational Failure</h3>
        <p className="text-xs text-slate-550 dark:text-slate-400 mt-2">{error || "Complaint ticket could not be sourced."}</p>
        <button 
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold rounded-lg transition-colors"
        >
          Return to Queue
        </button>
      </div>
    );
  }

  const timelineItems = compileTimeline();

  // Get assigned staff name
  const staffObj = staffList.find(s => s.id === complaint.assignedStaff);
  const currentStaffName = staffObj ? staffObj.name : "Unassigned";

  // Check permissions: Staff can only edit if assigned
  const canModifyTicket = currentUser.role !== UserRole.STAFF || complaint.assignedStaff === currentUser.id;

  return (
    <div className="space-y-6">
      {/* Detail Header breadcrumb */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">{complaint.complaintId}</h2>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 font-bold rounded font-mono uppercase">
                {complaint.category}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-450 mt-0.5">Logged on {new Date(complaint.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:self-center shrink-0">
          <SLACountdown createdAt={complaint.createdAt} status={complaint.status} slaDeadline={complaint.slaDeadline} />
          
          {/* Delete Button (Available to Admin and Manager) */}
          {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER) && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-955/15 hover:bg-rose-100 dark:hover:bg-rose-950/35 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors cursor-pointer"
              title="Delete ticket completely"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Ticket</span>
            </button>
          )}
        </div>
      </div>

      {/* Main double column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Detail specifications cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Ticket info specifications */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 col-span-2">
            <h3 className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-blue-600" />
              Ticket Specifications
            </h3>

            {/* Customer Details Box */}
            <div className="bg-slate-50/50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider block">Customer Name</span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                  <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  {complaint.customerName}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider block">Contact Phone</span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  {complaint.phone}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider block">Email Address</span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  <span className="truncate block max-w-full">{complaint.email}</span>
                </span>
              </div>
            </div>

            {/* Description Text content block */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider block">Statement of issue</span>
              <div className="bg-white dark:bg-slate-950 p-4.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                {complaint.description}
              </div>
            </div>

            {/* Additional parameters row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase block">Priority Level</span>
                <div className="mt-1">
                  {complaint.priority === ComplaintPriority.LOW && <span className="inline-flex py-0.5 px-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 font-bold text-[10px] rounded">Low</span>}
                  {complaint.priority === ComplaintPriority.MEDIUM && <span className="inline-flex py-0.5 px-2 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 font-bold text-[10px] rounded">Medium</span>}
                  {complaint.priority === ComplaintPriority.HIGH && <span className="inline-flex py-0.5 px-2 bg-amber-50 dark:bg-amber-955/20 text-amber-705 dark:text-amber-400 border border-amber-101 dark:border-amber-900/40 font-bold text-[10px] rounded">High Priority</span>}
                  {complaint.priority === ComplaintPriority.CRITICAL && <span className="inline-flex py-0.5 px-2 bg-red-50 dark:bg-red-955/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40 font-bold text-[10px] rounded pulse-glow">Critical</span>}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase block">Work Status</span>
                <div className="mt-1">
                  {complaint.status === ComplaintStatus.OPEN && <span className="font-bold text-[10px] uppercase text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-955/20 px-2 py-0.5 rounded-full border border-sky-100 dark:border-sky-900/30">Open Ticket</span>}
                  {complaint.status === ComplaintStatus.IN_PROGRESS && <span className="font-bold text-[10px] uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-955/20 px-2 py-0.5 rounded-full border border-amber-101 dark:border-amber-900/30">In Progress</span>}
                  {complaint.status === ComplaintStatus.ESCALATED && <span className="font-bold text-[10px] uppercase text-rose-600 dark:text-rose-450 bg-rose-50 dark:bg-rose-955/20 px-2 py-0.5 rounded-full border border-rose-101 dark:border-rose-900/30 pulse-glow">Escalated</span>}
                  {complaint.status === ComplaintStatus.RESOLVED && <span className="font-bold text-[10px] uppercase text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-955/20 px-2 py-0.5 rounded-full border border-emerald-101 dark:border-emerald-900/30">Resolved Case</span>}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase block">Assigned agent</span>
                <div className="mt-1 font-semibold text-slate-700 dark:text-slate-300">
                  {currentStaffName}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase block">SLA Deadline limit</span>
                <div className="mt-1 font-mono text-slate-650 dark:text-slate-400 font-medium">
                  {new Date(complaint.slaDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Timeline transaction logs */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 col-span-2">
            <h3 className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <History className="h-3.5 w-3.5 text-blue-600" />
              SLA & Notes Audit Timeline
            </h3>

            <div className="space-y-6 relative border-l-2 border-slate-100 dark:border-slate-800 pl-6 ml-3">
              {timelineItems.map((item, index) => (
                <div key={item.id} className="relative group">
                  {/* Circle dot icon representation */}
                  <div className={`absolute -left-[31px] top-1.5 h-4.5 w-4.5 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center text-white ${
                    item.type === "creation" ? "bg-slate-300 dark:bg-slate-700" :
                    item.type === "escalation" ? "bg-rose-500 pulse-glow" :
                    item.description.includes("🔧") ? "bg-slate-400 dark:bg-slate-600" :
                    item.description.includes("👤") ? "bg-sky-400" :
                    item.description.includes("⚡") ? "bg-amber-400" : "bg-blue-600"
                  }`} />

                  {/* Body cell container */}
                  <div className={`p-4 rounded-xl border ${
                    item.type === "escalation" 
                      ? "bg-rose-50/20 dark:bg-rose-955/15 border-rose-100 dark:border-rose-900/30" 
                      : item.type === "creation"
                      ? "bg-slate-50/50 dark:bg-slate-950/40 border-slate-150 dark:border-slate-800/80"
                      : "bg-slate-50/20 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/60"
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5 mb-1.5">
                      <span className={`text-[11px] font-bold ${
                        item.type === "escalation" ? "text-rose-700 dark:text-rose-400" : "text-slate-800 dark:text-slate-200"
                      }`}>
                        {item.title}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-medium">
                        {new Date(item.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>

                    <p className={`text-xs leading-relaxed ${item.type === "escalation" ? "text-rose-900 dark:text-rose-350 font-semibold" : "text-slate-600 dark:text-slate-300"}`}>
                      {item.description}
                    </p>

                    {item.author && (
                      <div className="flex gap-1 items-center text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                        <User className="h-3 w-3 text-blue-500" />
                        <span>{item.author}</span>
                        <span className="text-slate-200 dark:text-slate-800">|</span>
                        <span className="uppercase text-[9px] text-blue-600 dark:text-blue-400 font-bold">{item.role}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Agent Console handles */}
        <div className="space-y-6">
          
          {/* Quick SLA controls card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 text-blue-600" />
              Agent Console
            </h3>

            {/* Warning block if not allowed to modify */}
            {!canModifyTicket && (
              <div className="bg-amber-50 dark:bg-amber-955/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900/40 text-[11px] font-semibold text-amber-700 dark:text-amber-400 leading-normal">
                ⚠️ Case Restrictions: You are not assigned to handle this ticket. Changes are blocked.
              </div>
            )}

            <div className="space-y-4">
              {/* 1. Status picker */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Change Ticket Status
                </label>
                <select
                  disabled={!canModifyTicket || submittingAction}
                  value={quickStatus}
                  onChange={(e) => setQuickStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-50 text-xs text-slate-700 dark:text-slate-200 font-semibold rounded-lg focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value={ComplaintStatus.OPEN}>🔘 Open (New)</option>
                  <option value={ComplaintStatus.IN_PROGRESS}>🟡 In Progress</option>
                  <option value={ComplaintStatus.ESCALATED}>🚨 Escalated (Manual Escalation)</option>
                  <option value={ComplaintStatus.RESOLVED}>🟢 Resolved / Close Ticket</option>
                </select>
              </div>

              {/* 2. Assignment change (Admin/Manager only) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Assign Staff Partner
                </label>
                <select
                  disabled={currentUser.role === UserRole.STAFF || submittingAction}
                  value={quickStaff}
                  onChange={(e) => setQuickStaff(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 font-semibold rounded-lg focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="Unassigned">Leave unassigned</option>
                  {staffList.filter((st) => st.status !== "suspended").map((st) => (
                    <option key={st.id} value={st.id}>{st.name} ({st.role})</option>
                  ))}
                </select>
              </div>

              {/* 3. Priority upgrade (Admin/Manager only) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Override Urgency/Priority
                </label>
                <select
                  disabled={currentUser.role === UserRole.STAFF || submittingAction}
                  value={quickPriority}
                  onChange={(e) => setQuickPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 font-semibold rounded-lg focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-sans"
                >
                  <option value={ComplaintPriority.LOW}>Low Priority</option>
                  <option value={ComplaintPriority.MEDIUM}>Medium Priority</option>
                  <option value={ComplaintPriority.HIGH}>High Priority SLA</option>
                  <option value={ComplaintPriority.CRITICAL}>Critical Flash</option>
                </select>
              </div>

              {canModifyTicket && (
                <button
                  type="button"
                  id="apply-escalation-btn"
                  disabled={submittingAction}
                  onClick={handleApplyActions}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-sans text-xs font-bold rounded-lg transition-colors"
                >
                  {submittingAction ? "Updating properties..." : "Update Console Properties"}
                </button>
              )}
            </div>
          </div>

          {/* Comment note submission form card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
              Write operational note
            </h3>

            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                disabled={!canModifyTicket || submittingNote}
                rows={4}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Post updates, comments, call back records, or customer reimbursement calculations here..."
                required
                className="w-full p-3 border border-slate-200 dark:border-slate-700 text-xs rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50/50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none font-sans"
              />
              <button
                type="submit"
                disabled={!canModifyTicket || submittingNote || !newNoteText.trim()}
                className="w-full py-2 bg-slate-800 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-900/80 text-white font-sans text-xs font-bold rounded-lg disabled:opacity-50 transition-colors"
              >
                {submittingNote ? "Submitting note..." : "Post Progress Comment"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-lg space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h4 className="text-sm font-bold font-sans">Delete Ticket Irreversibly?</h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Warning: Deleting this ticket will wipe its entire history logs, progress notes, and SLA status irreversibly from the database. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  handleDeleteComplaint();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
