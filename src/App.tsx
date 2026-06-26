/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Compass, Bell, LogOut, Shield, Briefcase, 
  ClipboardList, Users, BarChart2, Sun, Moon
} from "lucide-react";
import { UserRole, Complaint, Notification } from "./types";
import LoginView from "./components/LoginView";
import DashboardView from "./components/DashboardView";
import ComplaintDetailsView from "./components/ComplaintDetailsView";
import AnalyticsView from "./components/AnalyticsView";
import TeamManagementView from "./components/TeamManagementView";

export default function App() {
  // Auth state variables
  const [token, setToken] = useState<string | null>(localStorage.getItem("manivtha_auth_token"));
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Theme support
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("system_theme") === "dark";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("system_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("system_theme", "light");
    }
  }, [darkMode]);

  // Global variables synced continuously
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  // Router layout states
  const [activeTab, setActiveTab] = useState<"queue" | "analytics" | "team">("queue");

  // 1. Initial auth verification
  const verifyToken = async (savedToken: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${savedToken}` }
      });
      const data = await response.json();
      if (response.ok) {
        setCurrentUser(data.user);
      } else {
        // Token was invalid / expired
        handleLogout();
      }
    } catch {
      handleLogout();
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      verifyToken(token);
    } else {
      setAuthLoading(false);
    }
  }, [token]);

  // Sync core application data
  const syncApplicationData = async () => {
    if (!token) return;
    try {
      const authHeader = { "Authorization": `Bearer ${token}` };

      // Fetch Complaints, Staff, and Notifications
      const [complaintsRes, staffRes, notificationsRes] = await Promise.all([
        fetch("/api/complaints", { headers: authHeader }),
        fetch("/api/users/staff", { headers: authHeader }),
        fetch("/api/notifications", { headers: authHeader })
      ]);

      if (
        complaintsRes.status === 401 || complaintsRes.status === 403 ||
        staffRes.status === 401 || staffRes.status === 403 ||
        notificationsRes.status === 401 || notificationsRes.status === 403
      ) {
        handleLogout();
        return;
      }

      if (complaintsRes.ok && staffRes.ok && notificationsRes.ok) {
        const complaintsData = await complaintsRes.json();
        const staffData = await staffRes.json();
        const notificationsData = await notificationsRes.json();

        setComplaints(complaintsData);
        setStaffList(staffData);
        setNotifications(notificationsData);
      }
    } catch (error) {
      console.error("Failed to refresh dashboard state", error);
    }
  };

  // Poll server for live counters & SLA changes every 15 seconds
  useEffect(() => {
    if (token && currentUser) {
      syncApplicationData();
      const interval = setInterval(syncApplicationData, 15000);
      return () => clearInterval(interval);
    }
  }, [token, currentUser]);

  // Page blink state and trigger for manual refreshes
  const [isBlinking, setIsBlinking] = useState(false);

  const handleManualRefresh = async () => {
    setIsBlinking(true);
    await syncApplicationData();
    setTimeout(() => {
      setIsBlinking(false);
    }, 500);
  };

  // Auth Handlers
  const handleLoginSuccess = (newToken: string, user: any) => {
    localStorage.setItem("manivtha_auth_token", newToken);
    setToken(newToken);
    setCurrentUser(user);
    // Dynamic entry tab based on operational role
    setActiveTab("queue");
  };

  const handleLogout = () => {
    localStorage.removeItem("manivtha_auth_token");
    setToken(null);
    setCurrentUser(null);
    setSelectedComplaintId(null);
    setIsNotifOpen(false);
  };

  // Notification interactions
  const handleMarkNotificationRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering open detail Click callback
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(notifications.map(n => n.id === id ? { ...n, status: "read" } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(notifications.map(n => ({ ...n, status: "read" })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    // Mark as read first
    if (notif.status === "unread") {
      try {
        await fetch(`/api/notifications/${notif.id}/read`, {
          method: "PUT",
          headers: { "Authorization": `Bearer ${token}` }
        });
        setNotifications(notifications.map(n => n.id === notif.id ? { ...n, status: "read" } : n));
      } catch (err) {
        console.error(err);
      }
    }

    setIsNotifOpen(false);

    // If notification links specifically to a complaint, navigate there!
    if (notif.complaintId) {
      setSelectedComplaintId(notif.complaintId);
      setActiveTab("queue");
    }
  };

  // Loading Splash Screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Compass className="h-9 w-9 text-blue-600 dark:text-blue-450 animate-spin mx-auto text-center" />
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-sans uppercase tracking-widest">
            Loading SLA Console...
          </p>
        </div>
      </div>
    );
  }

  // Not Authenticated -> Mount Login View
  if (!token || !currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Determine unread notifications counts
  const unreadCount = notifications.filter(n => n.status === "unread").length;

  return (
    <div className={`min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 select-none ${isBlinking ? "animate-page-blink" : ""}`}>
      
      {/* 1. Global Navigation Top Toolbar Headers */}
      <header className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-40 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo Group */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSelectedComplaintId(null); setActiveTab("queue"); }}>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0">
                <Compass className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="leading-tight">
                <span className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase block">MANIVTHA</span>
                <span className="text-[10px] text-slate-550 dark:text-slate-400 font-medium uppercase tracking-widest block -mt-0.5">Tours & Travels</span>
              </div>
            </div>

            {/* Navigation Tabs based on clearances */}
            <nav className="flex space-x-1 bg-slate-50 dark:bg-slate-955 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              {/* Tab 1: Queue (All users can view) */}
              <button
                id="tab-queue"
                onClick={() => { setSelectedComplaintId(null); setActiveTab("queue"); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === "queue" 
                    ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700" 
                    : "text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Ticket Queue
              </button>

              {/* Tab 2: Analytics (Admin & Manager only) */}
              {currentUser.role !== UserRole.STAFF && (
                <button
                  id="tab-analytics"
                  onClick={() => { setSelectedComplaintId(null); setActiveTab("analytics"); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                    activeTab === "analytics" 
                      ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700" 
                      : "text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  Performance
                </button>
              )}

              {/* Tab 3: Management (Manager only) */}
              {currentUser.role === UserRole.MANAGER && (
                <button
                  id="tab-team"
                  onClick={() => { setSelectedComplaintId(null); setActiveTab("team"); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                    activeTab === "team"
                      ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700" 
                      : "text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Staff Directory
                </button>
              )}
            </nav>

            {/* Interactive Bell notification triggers and User block */}
            <div className="flex items-center gap-3">
              
              {/* Theme Toggle Button */}
              <button
                id="theme-toggle-btn"
                onClick={() => setDarkMode(!darkMode)}
                className="h-9 w-9 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? <Sun className="h-4 w-4 text-amber-500 animate-pulse" /> : <Moon className="h-4 w-4 text-slate-600" />}
              </button>

              {/* Notification bell trigger */}
              <div className="relative shrink-0">
                <button
                  id="notifications-bell-btn"
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className={`h-9 w-9 rounded-lg border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-450 transition-all ${
                    isNotifOpen ? "bg-blue-50 dark:bg-slate-850 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-705"
                  }`}
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span 
                      id="notifications-badge"
                      className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white font-mono"
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown Pane */}
                {isNotifOpen && (
                  <div 
                    id="notifications-panel"
                    className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-2 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-750 dark:text-slate-200">In-App Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllNotificationsRead}
                          className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 dark:text-slate-550 text-xs font-medium">
                          No notifications received yet.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 leading-relaxed cursor-pointer flex gap-2 w-full text-left items-start transition-all ${
                              notif.status === "unread" ? "bg-blue-50/10 dark:bg-blue-950/20 font-medium" : ""
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${
                              notif.status === "unread" ? "bg-blue-650 dark:bg-blue-400" : "bg-slate-350 dark:bg-slate-600"
                            }`} />
                            <div className="flex-1 space-y-1">
                              <p className="text-slate-700 dark:text-slate-300 font-sans">{notif.message}</p>
                              <div className="flex justify-between items-center text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                                <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                {notif.status === "unread" && (
                                  <button
                                    onClick={(e) => handleMarkNotificationRead(notif.id, e)}
                                    className="text-[9.5px] text-blue-600 dark:text-blue-400 hover:underline font-bold"
                                  >
                                    Mark as read
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Block info */}
              <div className="hidden sm:flex flex-col items-end pl-3 border-l border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">{currentUser.name}</span>
                <span className="text-[9px] font-extrabold uppercase text-blue-650 dark:text-blue-400 mt-0.5 tracking-wider">
                  {currentUser.role} Clearances
                </span>
              </div>

              {/* Logout */}
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="h-9 w-9 bg-slate-50 hover:bg-red-50 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-600 transition-colors"
                title="Sign out of console"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* 2. Main Content Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedComplaintId ? (
          /* Mounted Single Detail view */
          <ComplaintDetailsView
            complaintId={selectedComplaintId}
            currentUser={currentUser}
            staffList={staffList}
            onBack={() => setSelectedComplaintId(null)}
            onRefreshList={handleManualRefresh}
          />
        ) : (
          /* Multi-Tab Navigation views */
          <>
            {activeTab === "queue" && (
              <DashboardView
                complaints={complaints}
                staffList={staffList}
                currentUser={currentUser}
                onViewDetails={(id) => setSelectedComplaintId(id)}
                onRefresh={handleManualRefresh}
              />
            )}

            {activeTab === "analytics" && currentUser.role !== UserRole.STAFF && (
              <AnalyticsView
                complaints={complaints}
                staffList={staffList}
              />
            )}

            {activeTab === "team" && currentUser.role === UserRole.MANAGER && (
              <TeamManagementView
                currentUser={currentUser}
                staffList={staffList}
                onRefresh={handleManualRefresh}
              />
            )}
          </>
        )}
      </main>

      {/* 3. Global humbler Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-3.5 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest print:hidden">
        <span>© 2026 Manivtha Tours & Travels. Automated SLA Resolution Framework.</span>
      </footer>

    </div>
  );
}
