/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = "admin",
  STAFF = "staff",
  MANAGER = "manager"
}

export enum ComplaintPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

export enum ComplaintStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  ESCALATED = "escalated",
  RESOLVED = "resolved"
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string; // Opt out of sending password in UI responses
  status?: "active" | "suspended";
}

export interface Complaint {
  id: string;          // Auto-incrementing or short custom UUID
  complaintId: string; // Auto-generated textual identifier e.g., "MVT-1001"
  customerName: string;
  phone: string;
  email: string;
  category: string;
  description: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assignedStaff: string; // User ID of assigned staff component, or "Unassigned"
  createdAt: string;     // ISO String representing UTC creation date
  updatedAt: string;     // ISO String representing last edit
  resolvedAt?: string;   // ISO String of resolution
  slaDeadline: string;   // ISO String: createdAt + 4 hours
  escalatedAt?: string;  // ISO String of escalation
}

export interface Escalation {
  id: string;
  complaintId: string;  // references Complaint.complaintId
  escalationTime: string;
  escalationReason: string;
}

export interface Note {
  id: string;
  complaintId: string;  // references Complaint.complaintId
  userId: string;
  userName: string;     // Denormalized name for easier API rendering
  role: UserRole;       // Denormalized role
  note: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;       // User ID to notify, or "all" for general broadcasts
  message: string;
  status: "unread" | "read";
  createdAt: string;
  complaintId?: string; // Optional reference
}

// REST API return schemas for easier typing
export interface DashboardStats {
  total: number;
  open: number;
  inProgress: number;
  escalated: number;
  resolved: number;
}
