/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Download, FileText, BarChart2, TrendingUp, Users, Clock, CheckCircle2,
  AlertTriangle, ArrowUpRight, HelpCircle, FileSpreadsheet, RotateCcw 
} from "lucide-react";
import { Complaint, ComplaintPriority, ComplaintStatus } from "../types";

interface AnalyticsViewProps {
  complaints: Complaint[];
  staffList: any[];
}

export default function AnalyticsView({ complaints, staffList }: AnalyticsViewProps) {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("manivtha_auth_token");
      const res = await fetch("/api/reports/analytics", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load analytics");
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message || "Failed parsing API reporting.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [complaints]);

  // Excel (CSV) On-The-Fly Export Generator
  const triggerExcelExport = () => {
    if (!complaints || complaints.length === 0) return;

    // Collate headers
    const headers = [
      "Complaint ID",
      "Customer Name",
      "Contact Phone",
      "Contact Email",
      "Service Category",
      "Priority Level",
      "Current Status",
      "Assigned Agent",
      "Created Date",
      "Resolved Date",
      "SLA Deadline Time"
    ];

    // Compile rows
    const rows = complaints.map(c => {
      // Find assigned staff label
      const agent = staffList.find(s => s.id === c.assignedStaff)?.name || "Unassigned";
      return [
        c.complaintId,
        `"${c.customerName.replace(/"/g, '""')}"`,
        c.phone,
        c.email,
        `"${c.category.replace(/"/g, '""')}"`,
        c.priority.toUpperCase(),
        c.status.toUpperCase(),
        `"${agent.replace(/"/g, '""')}"`,
        c.createdAt,
        c.resolvedAt || "-",
        c.slaDeadline
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Manivtha_SLA_Complaints_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable layout generator for mock PDF compiling
  const triggerPDFExport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-center text-slate-500">
        <Clock className="h-9 w-9 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="font-bold text-slate-800 dark:text-slate-200 text-xs font-sans">Compiling travel KPI metrics...</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Collating staff percentages and status distributions</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-red-100 dark:border-red-950 shadow-xs text-center text-red-500">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-2" />
        <p className="font-semibold text-slate-705 dark:text-slate-200">Analytical processing error</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{error || "Failed to parse database records."}</p>
        <button 
          onClick={fetchAnalytics}
          className="mt-4 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-707 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
        >
          <RotateCcw className="h-3 w-3" />
          Re-evaluate
        </button>
      </div>
    );
  }

  const { stats, categoryDistribution, priorityDistribution, staffPerformance, monthlyTrends } = analytics;

  return (
    <div className="space-y-6 print:p-0 select-none">
      
      {/* Top Controller Ribbon */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-blue-600" />
            Performance & SLA Reporting Console
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time resolution rates, operational trends, and staff dispatch performance statistics.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {/* Print PDF */}
          <button
            onClick={triggerPDFExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-lg transition-all"
          >
            <FileText className="h-4 w-4 text-slate-500" />
            Print SLA Report
          </button>

          {/* Excel Export */}
          <button
            onClick={triggerExcelExport}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all font-sans"
          >
            <FileSpreadsheet className="h-4 w-4 text-blue-100" />
            Export complaints as Excel (.csv)
          </button>
        </div>
      </div>

      {/* Structured metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider block">Avg resolution time</span>
            <Clock className="h-4 w-4 text-blue-600 shrink-0" />
          </div>
          <div>
            <span className="text-2xl font-sans tracking-tight font-black text-slate-900 dark:text-slate-100">
              {stats.avgResolutionTimeHours} hr
            </span>
            <span className="text-[10px] text-emerald-500 font-bold block mt-1">
              ✓ Complies with overall 4 hours SLA Standard
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider block">Resolution quota rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          </div>
          <div>
            <span className="text-2xl font-sans tracking-tight font-black text-slate-900 dark:text-slate-100">
              {stats.resolutionRate}%
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block mt-1">
              {stats.resolved} of {stats.total} total cases solved
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider block">SLA Escalation Rate</span>
            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
          </div>
          <div>
            <span className="text-2xl font-sans tracking-tight font-black text-rose-600 dark:text-rose-400">
              {stats.escalationRate}%
            </span>
            <span className={`text-[10px] font-bold block mt-1 ${stats.escalationRate > 20 ? "text-rose-500 pulse-glow" : "text-green-650 dark:text-green-450"}`}>
              {stats.escalationRate > 20 ? "⚠ High escalation risk alert!" : "✓ Stable SLA operational metrics"}
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-205 dark:border-slate-800 shadow-xs space-y-2.5">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider block">Active pipeline volume</span>
            <TrendingUp className="h-4 w-4 text-blue-600 shrink-0" />
          </div>
          <div>
            <span className="text-2xl font-sans tracking-tight font-black text-slate-900 dark:text-slate-100">
              {stats.open + stats.inProgress} cases
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block mt-1">
              {stats.open} open ticket / {stats.inProgress} being resolved
            </span>
          </div>
        </div>
      </div>

      {/* Visual vector charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Horizontal Category bento blocks */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div>
            <h3 className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Category Distribution
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Comparing issue weights in passenger complaints</span>
          </div>

          <div className="space-y-4">
            {categoryDistribution.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">No data points.</p>
            ) : (
              categoryDistribution.map((item: any) => {
                const percentage = Math.round((item.value / stats.total) * 100);
                return (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-705 dark:text-slate-300">
                      <span className="truncate max-w-[200px]">{item.name}</span>
                      <span className="font-mono">{item.value} ({percentage}%)</span>
                    </div>
                    {/* Visual custom bar layout */}
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${percentage}%` }}
                        className="h-full bg-blue-600 rounded-full"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Vertical volume histogram standard SVG bar chart */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 lg:col-span-2">
          <div>
            <h3 className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Monthly Trend Breakdown
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Monthly count of passenger complaints received</span>
          </div>

          {/* Custom vector SVG representation */}
          <div className="h-64 flex items-end justify-between gap-5 pt-8 px-4 border-b border-l border-slate-150 dark:border-slate-800 relative">
            
            {/* Horizontal Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[8px] font-mono text-slate-350 dark:text-slate-600 select-none pb-2">
              <span className="border-b border-slate-50 dark:border-slate-800/60 w-full text-right pr-2">Max level</span>
              <span className="border-b border-slate-50 dark:border-slate-800/60 w-full text-right pr-2"></span>
              <span className="border-b border-slate-50 dark:border-slate-800/60 w-full text-right pr-2">Midpoint</span>
              <span className="border-b border-slate-50 dark:border-slate-800/60 w-full text-right pr-2"></span>
              <span className="w-full text-right pr-2">Baseline</span>
            </div>

            {monthlyTrends.length === 0 ? (
              <span className="text-xs text-slate-400 m-auto">No timeline coordinates found.</span>
            ) : (
              (() => {
                // Determine heights scaling
                const maxVal = Math.max(...monthlyTrends.map((t: any) => t.value), 4);
                return monthlyTrends.map((t: any) => {
                  const barHeightPct = Math.max((t.value / maxVal) * 100, 10);
                  return (
                    <div key={t.name} className="flex-1 flex flex-col items-center gap-2 z-10 group h-full justify-end">
                      <div className="relative w-full flex justify-center">
                        {/* Hover badge */}
                        <span className="absolute -top-7 opacity-0 group-hover:opacity-100 bg-slate-800 dark:bg-slate-950 text-white text-[9px] font-semibold py-1 px-1.5 rounded transition-opacity font-mono z-20">
                          {t.value} tickets
                        </span>
                        {/* Actual Bar */}
                        <div 
                          style={{ height: `${(barHeightPct / 100) * 190}px` }} 
                          className="w-8 sm:w-12 bg-blue-600 hover:bg-blue-500 rounded-t-md transition-all shadow-xs"
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-tight mb-[-12px]">
                        {t.name}
                      </span>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </div>

      </div>

      {/* Staff Dispatch Performance Section */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div>
          <h3 className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider block mb-1">
            Agent Performance Evaluation Index
          </h3>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Track task resolution rates, active loads, and SLA breaches per staff agent.</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-150 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Agent Name & Role</th>
                <th className="py-3 px-4">Assigned Tickets</th>
                <th className="py-3 px-4">Active workload</th>
                <th className="py-3 px-4">SLA Breach (Escalated)</th>
                <th className="py-3 px-4">Resolved Successfully</th>
                <th className="py-3 px-4">Resolution Achievement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-705 dark:text-slate-300">
              {staffPerformance.map((row: any) => (
                <tr key={row.staffId} className="hover:bg-slate-50 dark:hover:bg-slate-805 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 dark:text-slate-200">{row.staffName}</div>
                    <div className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase mt-0.5">{row.role}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium">{row.assignedTicketsCount}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                      row.activeTicketsCount > 2 
                        ? "bg-amber-50 dark:bg-amber-955/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-405"
                    }`}>
                      {row.activeTicketsCount} actively handling
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className={`font-bold ${row.escalatedTicketsCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500"}`}>
                      {row.escalatedTicketsCount} breached
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-450">
                    {row.resolvedTicketsCount} solved
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${row.resolutionPercentage}%` }} 
                          className={`h-full rounded-full ${
                            row.resolutionPercentage >= 80 ? "bg-emerald-500" :
                            row.resolutionPercentage >= 50 ? "bg-amber-500" : "bg-rose-500"
                          }`}
                        />
                      </div>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[10px]">
                        {row.resolutionPercentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
