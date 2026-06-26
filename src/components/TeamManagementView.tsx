/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Users, UserPlus, Trash2, Mail, ShieldCheck, ShieldAlert, Key, 
  CornerDownRight, User, AlertCircle, HelpCircle, UserX, Edit2,
  Eye, EyeOff
} from "lucide-react";
import { UserRole } from "../types";

interface TeamManagementViewProps {
  currentUser: any;
  staffList: any[];
  onRefresh: () => void;
}

export default function TeamManagementView({ 
  currentUser, 
  staffList, 
  onRefresh 
}: TeamManagementViewProps) {
  
  // Registration Form state variables
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.STAFF);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Form state variables
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<UserRole>(UserRole.STAFF);
  const [editStatus, setEditStatus] = useState<"active" | "suspended">("active");
  const [editPassword, setEditPassword] = useState("");
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null);

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditStatus(user.status || "active");
    setEditPassword("");
    setEditSuccess(null);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditError(null);
    setEditSuccess(null);
    setIsUpdating(true);

    if (!editName.trim() || !editEmail.trim()) {
      setEditError("Name and Email are required.");
      setIsUpdating(false);
      return;
    }

    if (editPassword && editPassword.length < 6) {
      setEditError("Security passwords must consist of at least 6 characters.");
      setIsUpdating(false);
      return;
    }

    try {
      const token = localStorage.getItem("manivtha_auth_token");
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
          status: editStatus,
          password: editPassword || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      setEditSuccess("Staff clearance profile updated successfully.");
      onRefresh();

      setTimeout(() => {
        setEditingUser(null);
      }, 700);
    } catch (err: any) {
      setEditError(err.message || "An error occurred during updating.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Security Gate
  if (currentUser.role !== UserRole.MANAGER) {
    return (
      <div id="unauthorized-message" className="bg-white dark:bg-slate-900 rounded-2xl border border-red-150 dark:border-red-950/40 p-8 text-center text-red-500 shadow-sm max-w-2xl mx-auto mt-12">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4 animate-bounce" />
        <h2 className="text-lg font-black text-slate-900 dark:text-slate-200 tracking-tight">Security Access Restricted</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          The team registration database is reserved strictly for corporate Managers of <span className="font-bold text-blue-600">Manivtha Tours & Travels</span>.
          Standard Staff agents and Administrators do not hold clearances to inspect or register credentials.
        </p>
      </div>
    );
  }

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setFormError("All input fields are required.");
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match. Please verify.");
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setFormError("Security passwords must consist of at least 6 characters.");
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem("manivtha_auth_token");
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, password, role })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to provision user.");
      }

      setFormSuccess(`Successfully provisioned "${name}" as a corporate ${role.toUpperCase()} member.`);
      
      // Clear forms
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setRole(UserRole.STAFF);

      // Refresh listings
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || "An occurred creating credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitiateDelete = (userId: string, emailVal: string, targetRole: UserRole) => {
    if (currentUser.role !== UserRole.MANAGER) {
      alert("Clearance Denied: Only Managers can delete or revoke user credentials.");
      return;
    }

    if (userId === currentUser.id) {
      alert("Self truncation is denied. You cannot delete your logged-in profile.");
      return;
    }

    setUserToDelete({ id: userId, email: emailVal });
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const token = localStorage.getItem("manivtha_auth_token");
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not delete user.");
      }

      alert("User removed successfully.");
      onRefresh();
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left side: Register User form card */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 h-fit font-sans">
        <div>
          <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-blue-600" />
            Provision Crew Account
          </h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Register new travel agents, dashboard managers, or backup admin profiles.
          </p>
        </div>

        {formError && (
          <div className="bg-red-50 dark:bg-red-955/20 border border-red-150 dark:border-red-900/40 rounded-lg p-3 text-xs font-semibold text-red-700 dark:text-red-400 flex gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="bg-emerald-50 dark:bg-emerald-955/20 border border-emerald-150 dark:border-emerald-900/40 rounded-lg p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>{formSuccess}</span>
          </div>
        )}

        <form onSubmit={handleRegisterUser} className="space-y-4">
          {/* Real name */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Team Member Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rahul Deshmukh"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 font-sans shadow-xs"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Corporate Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul@manivtha.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 font-sans shadow-xs"
              />
            </div>
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Operational Role & Clearances
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 font-sans shadow-xs"
            >
              <option value={UserRole.STAFF}>Staff Agent (Handles Tickets & Progress Notes)</option>
              <option value={UserRole.MANAGER}>Manager (Oversees SLA & Escalations)</option>
              <option value={UserRole.ADMIN}>Full Administrator (Global Controls & Deletes)</option>
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Temporary Security Password
            </label>
            <div className="relative flex items-center">
              <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password123"
                className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 font-sans shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer focus:outline-none flex items-center"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Verify Security Password
            </label>
            <div className="relative flex items-center">
              <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="password123"
                className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 font-sans shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer focus:outline-none flex items-center"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-xs font-bold rounded-lg shadow-sm transition-colors font-sans"
          >
            {isSubmitting ? "Provisioning credentials..." : "Issue Credentials"}
          </button>
        </form>

      </div>

      {/* Right side: Employee accounts list table */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 lg:col-span-2">
        <div>
          <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            Registered Staff Directories
          </h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Audit team credentials and revoke clearances when staff exit duties.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20">
          <table className="w-full text-left font-sans text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-slate-55 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Profile & Initials</th>
                <th className="py-3.5 px-4">Corporate email</th>
                <th className="py-3.5 px-4">Access Status</th>
                <th className="py-3.5 px-4 text-right">Clearance Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-705 dark:text-slate-300">
              {staffList.map((user) => {
                const isSelf = user.id === currentUser.id;
                return (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-805 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold font-sans text-xs">
                          {user.name ? user.name.trim().split(/\s+/).map((n: string) => n[0]).join("").toUpperCase() : "U"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                            {user.name} 
                            {isSelf && (
                              <span className="p-0.5 px-1 bg-blue-50 dark:bg-blue-950/45 text-blue-600 dark:text-blue-400 font-extrabold text-[8px] rounded border border-blue-101 dark:border-blue-900/40 uppercase scale-90 font-sans">
                                You
                              </span>
                            )}
                          </div>
                          
                          {/* Role badges */}
                          <div className="mt-0.5">
                            {user.role === UserRole.ADMIN && (
                              <span className="font-extrabold text-[8px] uppercase tracking-wider bg-purple-50 dark:bg-purple-955/20 text-purple-700 dark:text-purple-400 border border-purple-101 dark:border-purple-900/40 rounded-full px-2 py-0.5">
                                Administrator
                              </span>
                            )}
                            {user.role === UserRole.MANAGER && (
                              <span className="font-extrabold text-[8px] uppercase tracking-wider bg-amber-50 dark:bg-amber-955/20 text-amber-705 dark:text-amber-400 border border-amber-101 dark:border-amber-900/45 rounded-full px-2 py-0.5">
                                Supervisor Manager
                              </span>
                            )}
                            {user.role === UserRole.STAFF && (
                              <span className="font-extrabold text-[8px] uppercase tracking-wider bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-101 dark:border-blue-900/40 rounded-full px-2 py-0.5">
                                Standard Staff
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 select-all font-medium">
                      {user.email}
                    </td>

                    <td className="py-3 px-4">
                      {user.status === "suspended" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 dark:text-rose-455 font-bold bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded border border-rose-101 dark:border-rose-900/40">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-450 font-bold bg-emerald-50 dark:bg-emerald-955/20 px-2 py-0.5 rounded border border-emerald-101 dark:border-emerald-900/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Clearance Active
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          id={`edit-btn-${user.id}`}
                          onClick={() => handleOpenEdit(user)}
                          className="px-2.5 py-1 hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 hover:border-blue-350 rounded-lg text-blue-600 transition-all font-semibold shrink-0 inline-flex items-center gap-1.5 text-[10px]"
                          title="Edit employee profile & clearance rules"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit Details
                        </button>

                        <button
                          id={`revoke-btn-${user.id}`}
                          onClick={() => handleInitiateDelete(user.id, user.email, user.role)}
                          disabled={isSelf}
                          className="px-2.5 py-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 hover:border-rose-350 rounded-lg text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:border-transparent transition-all font-semibold shrink-0 inline-flex items-center gap-1.5 text-[10px]"
                          title={
                            isSelf 
                              ? "Self profiles are protected" 
                              : "Revoke employee access"
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Revoke Access
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Profile Backdrop Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-full max-w-md p-6 overflow-hidden relative space-y-4">
            
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-blue-600" />
                  Edit Clearance Credentials
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Editing profile details for <span className="font-bold text-slate-800 dark:text-slate-350">{editingUser.name}</span>
                </p>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="bg-red-50 dark:bg-red-955/20 border border-red-150 dark:border-red-900/40 rounded-lg p-3 text-xs font-semibold text-red-700 dark:text-red-400 flex gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            {editSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-955/20 border border-emerald-150 dark:border-emerald-900/40 rounded-lg p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-450 flex gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{editSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Team Member Name (Initials are derived)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="E.g. Vikram Kulkarni"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Corporate Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="E.g. vikram@manivtha.com"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>

              {/* Optional New Password */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  New Security Password (Leave blank to keep current)
                </label>
                <div className="relative flex items-center">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 chars)"
                    className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer focus:outline-none flex items-center"
                    aria-label={showEditPassword ? "Hide password" : "Show password"}
                  >
                    {showEditPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Role Select */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Clearance Level & Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  disabled={editingUser.id === currentUser.id}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 disabled:opacity-50"
                >
                  <option value={UserRole.STAFF}>Staff Agent (Handles Tickets & Progress Notes)</option>
                  <option value={UserRole.MANAGER}>Manager (Oversees SLA & Escalations)</option>
                  <option value={UserRole.ADMIN}>Full Administrator (Global Controls & Deletes)</option>
                </select>
                {editingUser.id === currentUser.id && (
                  <p className="text-[9px] text-amber-505 font-semibold mt-1">
                    ⚠ Warning: You cannot change your own clearance structure.
                  </p>
                )}
              </div>

              {/* Access Status Toggle */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Account Access Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as "active" | "suspended")}
                  disabled={editingUser.id === currentUser.id}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 disabled:opacity-50"
                >
                  <option value="active">Active (Full corporate access allowed)</option>
                  <option value="suspended">Suspended (Enforce access revocation immediately)</option>
                </select>
                {editingUser.id === currentUser.id && (
                  <p className="text-[9px] text-amber-505 font-semibold mt-1">
                    ⚠ Warning: Self-suspension is blocked.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2 font-sans">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-750 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                >
                  {isUpdating ? "Saving changes..." : "Save Profile Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Revoke Access Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-lg space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-450">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h4 className="text-sm font-bold font-sans">Revoke Staff Access?</h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Warning: You are deleting corporate user <span className="font-semibold text-slate-700 dark:text-slate-200">{userToDelete.email}</span>. This will completely revoke their access and block their entry. Continue?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = userToDelete.id;
                  setUserToDelete(null);
                  handleDeleteUser(targetId);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                Yes, Revoke Access
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
