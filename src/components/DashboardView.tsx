/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Filter, AlertCircle, Clock, CheckCircle2, 
  HelpCircle, MoreHorizontal, MessageSquare, ShieldAlert,
  Calendar, RotateCcw, User, Phone, Mail, FolderHeart 
} from "lucide-react";
import { Complaint, ComplaintPriority, ComplaintStatus, UserRole } from "../types";

// Standard client-side live countdown timer module
export function SLACountdown({ createdAt, status, slaDeadline }: { createdAt: string; status: ComplaintStatus; slaDeadline: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (status === ComplaintStatus.RESOLVED) {
      setTimeLeft("Closed");
      setIsUrgent(false);
      return;
    }
    
    if (status === ComplaintStatus.ESCALATED) {
      setTimeLeft("SLA BREACH");
      setIsUrgent(true);
      return;
    }

    const calculateTimer = () => {
      const deadline = new Date(slaDeadline).getTime();
      const now = new Date().getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft("SLA BREACH");
        setIsUrgent(true);
        return;
      }

      const totalMinutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      if (hours === 0 && minutes < 30) {
        setIsUrgent(true);
      } else {
        setIsUrgent(false);
      }

      setTimeLeft(`${hours}h ${minutes}m left`);
    };

    calculateTimer();
    const interval = setInterval(calculateTimer, 15000); // refresh every 15 seconds
    return () => clearInterval(interval);
  }, [createdAt, status, slaDeadline]);

  if (status === ComplaintStatus.RESOLVED) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-sans">
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        Resolved
      </span>
    );
  }

  if (status === ComplaintStatus.ESCALATED || timeLeft === "SLA BREACH") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full font-mono pulse-glow border border-rose-200">
        <AlertCircle className="h-3 w-3 text-rose-600" />
        {timeLeft || "SLA BREACH"}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold font-mono px-2.5 py-1 rounded-full border ${
      isUrgent 
        ? "text-amber-800 bg-amber-50 border-amber-200 pulse-glow" 
        : "text-slate-700 bg-slate-50 border-slate-200"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isUrgent ? "bg-amber-600" : "bg-blue-500 animate-pulse"}`} />
      {timeLeft || "Calculating..."}
    </span>
  );
}

interface DashboardViewProps {
  complaints: Complaint[];
  staffList: any[];
  currentUser: any;
  onViewDetails: (complaintId: string) => void;
  onRefresh: () => void;
}

export default function DashboardView({ 
  complaints, 
  staffList, 
  currentUser, 
  onViewDetails, 
  onRefresh 
}: DashboardViewProps) {
  
  // Filtering & searching states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStaff, setFilterStaff] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Create Complaint Modal Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [category, setCategory] = useState("Booking & Reservation");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ComplaintPriority>(ComplaintPriority.MEDIUM);
  const [assignedStaff, setAssignedStaff] = useState("Unassigned");
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stats computation
  const totalCount = complaints.length;
  const openCount = complaints.filter(c => c.status === ComplaintStatus.OPEN).length;
  const progressCount = complaints.filter(c => c.status === ComplaintStatus.IN_PROGRESS).length;
  const escalatedCount = complaints.filter(c => c.status === ComplaintStatus.ESCALATED).length;
  const resolvedCount = complaints.filter(c => c.status === ComplaintStatus.RESOLVED).length;

  const categories = [
    "Booking & Reservation",
    "Bus/Cab Service Delay",
    "Tour Package Customization",
    "Hotel Accommodation Issue",
    "Refund & Cancellation",
    "Driver/Guide Misbehavior",
    "Luggage Loss/Damage",
    "Other"
  ];

  // Reset filter actions
  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterPriority("all");
    setFilterStaff("all");
    setFilterCategory("all");
  };

  // Submit Logger
  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setDrawerError(null);
    setIsSubmitting(true);

    if (!customerName || !customerPhone || !customerEmail || !description) {
      setDrawerError("Please check and fill out all customer information fields.");
      setIsSubmitting(false);
      return;
    }

    if (!assignedStaff || assignedStaff === "Unassigned") {
      setDrawerError("Please assign a staff member. A ticket cannot be logged without an assigned agent.");
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem("manivtha_auth_token");
      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          customerName,
          phone: customerPhone,
          email: customerEmail,
          category,
          description,
          priority,
          assignedStaff
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to log complaint.");
      }

      // Success
      setIsDrawerOpen(false);
      // Clear forms
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setDescription("");
      setCategory("Booking & Reservation");
      setPriority(ComplaintPriority.MEDIUM);
      setAssignedStaff("Unassigned");

      // Reload global list
      onRefresh();
    } catch (err: any) {
      setDrawerError(err.message || "An error occurred while logging.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Main high-precision logical filtering
  const filteredComplaints = complaints.filter((comp) => {
    // Keywords matching
    const searchLow = searchQuery.toLowerCase();
    const matchesSearch = 
      comp.complaintId.toLowerCase().includes(searchLow) ||
      comp.customerName.toLowerCase().includes(searchLow) ||
      comp.phone.includes(searchQuery) ||
      comp.email.toLowerCase().includes(searchLow) ||
      comp.category.toLowerCase().includes(searchLow);

    // Filters matching
    const matchesStatus = filterStatus === "all" || comp.status === filterStatus;
    const matchesPriority = filterPriority === "all" || comp.priority === filterPriority;
    const matchesCategory = filterCategory === "all" || comp.category === filterCategory;
    
    let matchesStaff = true;
    if (filterStaff !== "all") {
      matchesStaff = comp.assignedStaff === filterStaff;
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesStaff;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Control Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Active Complaint SLA Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time operations dashboard for <span className="font-semibold text-blue-600 dark:text-blue-400">Manivtha Tours & Travels</span>. SLA timers are strictly monitored.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-lg transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
          
          {/* Create ticket button (Blocked on Staff) */}
          {currentUser.role !== UserRole.STAFF && (
            <button
              id="new-complaint-btn"
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all"
            >
              <Plus className="h-4 w-4" />
              Log Complaint
            </button>
          )}
        </div>
      </div>

      {/* Quantitative Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Ticket count */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total logged</span>
            <span className="px-2 py-0.5 rounded text-slate-750 dark:text-slate-350 bg-slate-100 dark:bg-slate-800 text-[9px] font-bold">Total</span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-sans tracking-tight">{totalCount}</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">cases</span>
          </div>
        </div>

        {/* Open Counts */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">New Open</span>
            <span className="px-2 py-0.5 rounded text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 text-[9px] font-bold animate-pulse">Open</span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-xl font-bold text-sky-700 dark:text-sky-400 font-sans tracking-tight">{openCount}</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">pending</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">In Progress</span>
            <span className="px-2 py-0.5 rounded text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-955/30 text-[9px] font-bold">Active</span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-sans tracking-tight">{progressCount}</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">handling</span>
          </div>
        </div>

        {/* Escalated Counter */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/10 dark:bg-red-950/10 shadow-xs flex flex-col justify-between relative overflow-hidden">
          {escalatedCount > 0 && <span className="absolute top-0 right-0 h-8 w-8 bg-red-500 rotate-45 translate-x-4 -translate-y-4" />}
          <div className="flex justify-between items-center z-10">
            <span className="text-[10px] font-bold text-red-800 dark:text-red-400 uppercase tracking-wider">SLA Breached</span>
            <span className="px-2 py-0.5 rounded text-red-700 dark:text-red-400 bg-red-100/50 dark:bg-red-950/30 text-[9px] font-bold uppercase">Escalated</span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1 z-10">
            <span className="text-xl font-bold text-red-600 dark:text-red-400 font-sans tracking-tight">{escalatedCount}</span>
            <span className="text-[10px] font-semibold text-red-500 dark:text-red-500">violating SLA</span>
          </div>
        </div>

        {/* Resolved Counter */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Resolved</span>
            <span className="px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-[9px] font-bold">Closed</span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400 font-sans tracking-tight">{resolvedCount}</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">resolved</span>
          </div>
        </div>
      </div>

      {/* Structured Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Quick Keyword search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Complaint ID, Customer Name, Phone, Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-900 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all font-sans"
            />
          </div>

          <div className="flex flex-wrap md:flex-nowrap gap-2">
            {/* Filter by Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-705 dark:text-slate-300 text-xs font-semibold rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">📁 All Statuses</option>
              <option value="open">🔵 Open Cases</option>
              <option value="in_progress">🟡 In Progress</option>
              <option value="escalated">🔴 Escalated (Breached)</option>
              <option value="resolved">🟢 Resolved (Closed)</option>
            </select>

            {/* Filter by Priority */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-705 dark:text-slate-300 text-xs font-semibold rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">⚠️ All Priorities</option>
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="critical">Critical (Flash Escalation)</option>
            </select>

            {/* Category selection */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-705 dark:text-slate-300 text-xs font-semibold rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">🏷️ All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Filter by agent (Admins and managers can do this) */}
            {currentUser.role !== UserRole.STAFF && (
              <select
                value={filterStaff}
                onChange={(e) => setFilterStaff(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-705 dark:text-slate-300 text-xs font-semibold rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="all">👤 All Assigned Staff</option>
                <option value="Unassigned">Unassigned Only</option>
                {staffList.map((st) => (
                  <option key={st.id} value={st.id}>{st.name} ({st.role})</option>
                ))}
              </select>
            )}

            {/* Refresh buttons */}
            {(searchQuery || filterStatus !== "all" || filterPriority !== "all" || filterStaff !== "all" || filterCategory !== "all") && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Interface Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">ID</th>
                <th className="py-4 px-6">Customer & Ticket</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Priority</th>
                <th className="py-4 px-6">Assigned Staff</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">SLA Countdown</th>
                <th className="py-4 px-6">Created date</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <AlertCircle className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="font-semibold text-slate-500 dark:text-slate-400">No complaints match your filters.</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Try to refine search keywords or adjust dropdowns.</p>
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((comp) => {
                  // Get assigned staff name
                  const staffUser = staffList.find((s) => s.id === comp.assignedStaff);
                  const staffDisplayName = staffUser ? staffUser.name : "Unassigned";

                  return (
                    <tr 
                      key={comp.id} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        comp.status === ComplaintStatus.ESCALATED ? "bg-rose-50/15 dark:bg-rose-950/10" : ""
                      }`}
                    >
                      {/* Ticket unique code */}
                      <td className="py-4.5 px-6 font-mono font-bold text-blue-600 dark:text-blue-450 tracking-tight text-[11px]">
                        {comp.complaintId}
                      </td>

                      {/* Customer contact block */}
                      <td className="py-4.5 px-6">
                        <div className="font-bold text-slate-800 dark:text-slate-200 leading-tight">
                          {comp.customerName}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5 font-medium flex items-center gap-2">
                          <span>{comp.phone}</span>
                          <span className="text-slate-200 dark:text-slate-800">|</span>
                          <span className="truncate max-w-[120px]">{comp.email}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4.5 px-6 text-slate-600 dark:text-slate-400 font-medium">
                        {comp.category}
                      </td>

                      {/* SLA Priority levels */}
                      <td className="py-4.5 px-6">
                        {comp.priority === ComplaintPriority.LOW && (
                          <span className="inline-flex py-0.5 px-2 bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 font-bold text-[10px] rounded">Low</span>
                        )}
                        {comp.priority === ComplaintPriority.MEDIUM && (
                          <span className="inline-flex py-0.5 px-2 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 font-bold text-[10px] rounded">Medium</span>
                        )}
                        {comp.priority === ComplaintPriority.HIGH && (
                          <span className="inline-flex py-0.5 px-2 bg-amber-50 dark:bg-amber-955/20 text-amber-705 dark:text-amber-400 border border-amber-100 dark:border-amber-900/45 font-bold text-[10px] rounded">High</span>
                        )}
                        {comp.priority === ComplaintPriority.CRITICAL && (
                          <span className="inline-flex py-0.5 px-2 bg-red-50 dark:bg-red-955/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/45 font-bold text-[10px] rounded pulse-glow">Critical</span>
                        )}
                      </td>

                      {/* Assigned staff agent */}
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-1.5">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                            comp.assignedStaff === "Unassigned" 
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500" 
                              : "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                          }`}>
                            {comp.assignedStaff === "Unassigned" ? "?" : staffDisplayName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className={`font-semibold ${comp.assignedStaff === "Unassigned" ? "text-slate-400 italic dark:text-slate-500" : "text-slate-600 dark:text-slate-300"}`}>
                            {staffDisplayName}
                          </span>
                        </div>
                      </td>

                      {/* Status flag */}
                      <td className="py-4.5 px-6">
                        {comp.status === ComplaintStatus.OPEN && (
                          <span className="font-bold text-[10px] uppercase text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-955/20 px-2 py-0.5 rounded-full border border-sky-100 dark:border-sky-900/30">Open</span>
                        )}
                        {comp.status === ComplaintStatus.IN_PROGRESS && (
                          <span className="font-bold text-[10px] uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-955/20 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/30">In Progress</span>
                        )}
                        {comp.status === ComplaintStatus.ESCALATED && (
                          <span className="font-bold text-[10px] uppercase text-rose-600 dark:text-rose-450 bg-rose-50 dark:bg-rose-955/20 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-900/30 pulse-glow">Escalated</span>
                        )}
                        {comp.status === ComplaintStatus.RESOLVED && (
                          <span className="font-bold text-[10px] uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-955/20 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">Resolved</span>
                        )}
                      </td>

                      {/* Live countdown SLA counter */}
                      <td className="py-4.5 px-6">
                        <SLACountdown 
                           createdAt={comp.createdAt} 
                           status={comp.status} 
                           slaDeadline={comp.slaDeadline} 
                        />
                      </td>

                      {/* Created date representation */}
                      <td className="py-4.5 px-6 text-slate-455 dark:text-slate-400 font-medium">
                        {new Date(comp.createdAt).toLocaleDateString()}
                        <div className="text-[9px] text-slate-300 dark:text-slate-550 mt-0.5">
                          {new Date(comp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Details View Button */}
                      <td className="py-4.5 px-6 text-right">
                        <button
                          id={`view-btn-${comp.complaintId}`}
                          onClick={() => onViewDetails(comp.complaintId)}
                          className="px-3 py-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-white dark:hover:text-white hover:bg-blue-600 dark:hover:bg-blue-600 border border-blue-200 dark:border-slate-800 hover:border-transparent rounded-md transition-all font-sans"
                        >
                          Review Case
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Table summary info */}
        <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 px-6 py-3.5 flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          <span>Displaying {filteredComplaints.length} of {totalCount} total cases</span>
          <span>SLA standard: 4-hours deadline autoescalates</span>
        </div>
      </div>

      {/* Persistent sliding DRAWER Overlay for Log Complaint */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-xs flex justify-end">
          <div 
            id="register-drawer" 
            className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col justify-between overflow-y-auto"
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Log New Customer Complaint</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-550 mt-0.5">
                  Fills ticket parameters and triggers 4-hour SLA timers immediately.
                </p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold"
              >
                ×
              </button>
            </div>

            {/* Main Form Elements */}
            <form onSubmit={handleCreateComplaint} className="flex-1 p-6 space-y-5">
              {drawerError && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-3 text-xs font-semibold text-red-700 dark:text-red-400 flex gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{drawerError}</span>
                </div>
              )}

              {/* Passenger/Customer block headings */}
              <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-4">
                <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block border-b border-slate-100 dark:border-slate-800 pb-1">
                  1. Passenger contact details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Customer Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        required
                        placeholder="+91 99999 88888"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Email address */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="client@gmail.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Ticket particulars */}
              <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/85 space-y-4">
                <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block border-b border-slate-100 dark:border-slate-800 pb-1">
                  2. Complaint particulars
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Service Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 font-sans"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Urgency SLA Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 font-sans"
                    >
                      <option value={ComplaintPriority.LOW}>Low (Relaxed check)</option>
                      <option value={ComplaintPriority.MEDIUM}>Medium (Standard dispatch)</option>
                      <option value={ComplaintPriority.HIGH}>High Priority (Urgent response)</option>
                      <option value={ComplaintPriority.CRITICAL}>Critical Priority (Immediate action)</option>
                    </select>
                  </div>
                </div>

                {/* Assigned Staff */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Assign Agent Immediately *
                  </label>
                  <select
                    value={assignedStaff}
                    onChange={(e) => setAssignedStaff(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 font-sans"
                  >
                    <option value="Unassigned">-- Select agent (Required) --</option>
                    {staffList.filter((st) => st.status !== "suspended").map((st) => (
                      <option key={st.id} value={st.id}>{st.name} ({st.role})</option>
                    ))}
                  </select>
                </div>

                {/* Full Description text box */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Full Description of Issues *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Enter thorough tour details, booking references, tour guide name, hotels name, or flight codes where failure occurred..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 font-sans"
                  />
                </div>
              </div>

              {/* Bottom control handles */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex gap-3 justify-end bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-450 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-450 rounded-lg shadow-sm"
                >
                  {isSubmitting ? "Logging ticket..." : "Generate SLA Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
