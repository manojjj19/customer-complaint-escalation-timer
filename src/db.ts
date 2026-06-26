/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import bcryptjs from "bcryptjs";
import { 
  User, 
  Complaint, 
  Escalation, 
  Note, 
  Notification, 
  UserRole, 
  ComplaintStatus, 
  ComplaintPriority 
} from "./types";

interface DBStructure {
  users: User[];
  complaints: Complaint[];
  escalations: Escalation[];
  notes: Note[];
  notifications: Notification[];
}

const DB_PATH = path.join(process.cwd(), "db.json");

let dbCache: DBStructure | null = null;

// Helper to calculate SLA Deadline (createdAt + 4 hours)
export function getSLADeadline(createdAtStr: string): string {
  const d = new Date(createdAtStr);
  d.setHours(d.getHours() + 4);
  return d.toISOString();
}

function getInitialDB(): DBStructure {
  const now = new Date();
  
  // Create relative dates for rich presentation
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  // Near expiration (3 hours and 54 minutes ago) -> 6 minutes remaining!
  const nearExpiryTime = new Date(now.getTime() - (3 * 60 + 54) * 60 * 1000).toISOString();
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
  const tenHoursAgo = new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString();
  const pastEscalatedTime = new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString();

  // Create seeded passwords
  const salt = bcryptjs.genSaltSync(10);
  const adminHash = bcryptjs.hashSync("admin123", salt);
  const managerHash = bcryptjs.hashSync("manager123", salt);
  const staffHash = bcryptjs.hashSync("staff123", salt);

  const seededUsers: User[] = [
    { id: "u-1", name: "Ananya Sharma", email: "admin@manivtha.com", role: UserRole.ADMIN, password: adminHash },
    { id: "u-2", name: "Vikram Kulkarni", email: "manager@manivtha.com", role: UserRole.MANAGER, password: managerHash },
    { id: "u-3", name: "Rahul Deshmukh", email: "rahul@manivtha.com", role: UserRole.STAFF, password: staffHash },
    { id: "u-4", name: "Priya Nair", email: "priya@manivtha.com", role: UserRole.STAFF, password: staffHash }
  ];

  const seededComplaints: Complaint[] = [
    {
      id: "c-1",
      complaintId: "MVT-1001",
      customerName: "Rohan Gupta",
      phone: "+91 98765 43210",
      email: "rohan.g@gmail.com",
      category: "Refund & Cancellation",
      description: "Booked a Kerala honeymoon package (MVT-KRL-2026), but cancelled it 3 days in advance. Standard refund was initiated but has not credited to my bank account for 7 business days now.",
      priority: ComplaintPriority.HIGH,
      status: ComplaintStatus.OPEN,
      assignedStaff: "u-3",
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
      slaDeadline: getSLADeadline(oneHourAgo)
    },
    {
      id: "c-2",
      complaintId: "MVT-1002",
      customerName: "Sara Khan",
      phone: "+91 91234 56789",
      email: "sara.khan@yahoo.com",
      category: "Booking & Reservation",
      description: "Flight booking failed on the website but money was deducted. I have a connecting flight from Mumbai tomorrow morning and have not received the booking confirmation or PNR number.",
      priority: ComplaintPriority.CRITICAL,
      status: ComplaintStatus.IN_PROGRESS,
      assignedStaff: "u-4",
      createdAt: nearExpiryTime,
      updatedAt: nearExpiryTime,
      slaDeadline: getSLADeadline(nearExpiryTime)
    },
    {
      id: "c-3",
      complaintId: "MVT-1003",
      customerName: "Donald Fernandes",
      phone: "+91 93456 78901",
      email: "donald.f@outlook.com",
      category: "Cab Service Delay",
      description: "Cab driver defaulted on pickup for airport transfer in Pune. Had to book a local cab at double price to avoid missing the flight.",
      priority: ComplaintPriority.MEDIUM,
      status: ComplaintStatus.RESOLVED,
      assignedStaff: "u-3",
      createdAt: twelveHoursAgo,
      updatedAt: now.toISOString(),
      resolvedAt: now.toISOString(),
      slaDeadline: getSLADeadline(twelveHoursAgo)
    },
    {
      id: "c-4",
      complaintId: "MVT-1004",
      customerName: "Amit Patel",
      phone: "+91 99988 77766",
      email: "amit.patel@gmail.com",
      category: "Hotel Accommodation Issue",
      description: "Arrived at resort in Ooty booked through Manivtha Tours, but hotel says rooms are overbooked and no booking matches my voucher code. Waiting at the lobby with family.",
      priority: ComplaintPriority.CRITICAL,
      status: ComplaintStatus.ESCALATED,
      assignedStaff: "u-4",
      createdAt: tenHoursAgo,
      updatedAt: pastEscalatedTime,
      slaDeadline: getSLADeadline(tenHoursAgo),
      escalatedAt: pastEscalatedTime
    }
  ];

  const seededEscalations: Escalation[] = [
    {
      id: "e-1",
      complaintId: "MVT-1004",
      escalationTime: pastEscalatedTime,
      escalationReason: "SLA SLA countdown exceeded 4-hour limit without resolution. Automatic system escalation."
    }
  ];

  const seededNotes: Note[] = [
    {
      id: "n-1",
      complaintId: "MVT-1003",
      userId: "u-3",
      userName: "Rahul Deshmukh",
      role: UserRole.STAFF,
      note: "Apologized to customer. Initiated reimbursement process for additional cab expenses of ₹1200.",
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "n-2",
      complaintId: "MVT-1003",
      userId: "u-3",
      userName: "Rahul Deshmukh",
      role: UserRole.STAFF,
      note: "Refund processed and receipt shared. Customer confirmed receipt. Resolving complaint.",
      createdAt: now.toISOString()
    },
    {
      id: "n-3",
      complaintId: "MVT-1004",
      userId: "u-4",
      userName: "Priya Nair",
      role: UserRole.STAFF,
      note: "Contacted Ooty resort representative. Attempting to match reservation codes. Waiting for manager intervention.",
      createdAt: new Date(now.getTime() - 9 * 60 * 60 * 1000).toISOString()
    }
  ];

  const seededNotifications: Notification[] = [
    {
      id: "nt-1",
      userId: "u-4",
      message: "New high priority complaint MVT-1002 assigned to you.",
      status: "unread",
      createdAt: nearExpiryTime,
      complaintId: "MVT-1002"
    },
    {
      id: "nt-2",
      userId: "all",
      message: "Urgent SLA Alert: Complaint MVT-1004 has exceeded resolution timer and is escalated to Managers.",
      status: "unread",
      createdAt: pastEscalatedTime,
      complaintId: "MVT-1004"
    }
  ];

  return {
    users: seededUsers,
    complaints: seededComplaints,
    escalations: seededEscalations,
    notes: seededNotes,
    notifications: seededNotifications
  };
}

export function loadDB(): DBStructure {
  if (dbCache) {
    return dbCache;
  }
  
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      dbCache = JSON.parse(data);
      // Ensure all objects exist
      if (!dbCache!.users) dbCache!.users = [];
      if (!dbCache!.complaints) dbCache!.complaints = [];
      if (!dbCache!.escalations) dbCache!.escalations = [];
      if (!dbCache!.notes) dbCache!.notes = [];
      if (!dbCache!.notifications) dbCache!.notifications = [];
      return dbCache!;
    }
  } catch (error) {
    console.error("Failed to load db.json, generating seeds...", error);
  }

  // Not found or corrupted, generate seed
  dbCache = getInitialDB();
  saveDB();
  return dbCache;
}

export function saveDB(): void {
  if (!dbCache) return;
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save db.json", error);
  }
}

// Auto SLA Escalation Engine
// Checks for open / in_progress complaints where SLA time has expired
export function checkSLAEscalations(): { escalatedCount: number; escalatedIDs: string[] } {
  const db = loadDB();
  const now = new Date();
  const escalatedIDs: string[] = [];

  db.complaints = db.complaints.map((comp) => {
    // If complaint is Open/In Progress and past SLA Deadline:
    if (
      (comp.status === ComplaintStatus.OPEN || comp.status === ComplaintStatus.IN_PROGRESS) &&
      new Date(comp.slaDeadline).getTime() <= now.getTime()
    ) {
      comp.status = ComplaintStatus.ESCALATED;
      comp.updatedAt = now.toISOString();
      comp.escalatedAt = now.toISOString();
      escalatedIDs.push(comp.complaintId);

      // Create Escalation entry
      const escalationId = "e-" + Math.floor(Math.random() * 1000000);
      db.escalations.push({
        id: escalationId,
        complaintId: comp.complaintId,
        escalationTime: now.toISOString(),
        escalationReason: `Automated SLA Violation: Complaint unresolved within 4 hours.`
      });

      // Notify managers & admins
      const notifId = "nt-" + Math.floor(Math.random() * 1000000);
      db.notifications.push({
        id: notifId,
        userId: "all", // Broadcasting to everyone
        message: `🚨 SLA CRITICAL: Complaint ${comp.complaintId} (${comp.customerName}) has breached the 4-hour SLA timer and is escalated!`,
        status: "unread",
        createdAt: now.toISOString(),
        complaintId: comp.complaintId
      });
    }
    return comp;
  });

  if (escalatedIDs.length > 0) {
    saveDB();
  }

  return {
    escalatedCount: escalatedIDs.length,
    escalatedIDs
  };
}
