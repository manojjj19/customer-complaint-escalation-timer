/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { createServer as createViteServer } from "vite";
import { loadDB, saveDB, checkSLAEscalations, getSLADeadline } from "./src/db";
import { UserRole, ComplaintStatus, ComplaintPriority } from "./src/types";

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "manivtha_jwt_secret_tours_travels";

app.use(express.json());

// Express Mock-Timer: Trigger SLA Auto-Escalation Check on interval as well 
// (plus every API load ensures we have absolute real-time accuracy)
setInterval(() => {
  try {
    const res = checkSLAEscalations();
    if (res.escalatedCount > 0) {
      console.log(`[Timer Engine] Automatically escalated ${res.escalatedCount} idle complaints: ${res.escalatedIDs.join(", ")}`);
    }
  } catch (error) {
    console.error("[Timer Engine Error]", error);
  }
}, 30000); // Check every 30 seconds

// JWT Authentication Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token is missing" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decodedUser: any) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    // Ensure the user still exists in the database and is active
    const db = loadDB();
    const user = db.users.find((u: any) => u.id === decodedUser.id);
    if (!user) {
      return res.status(403).json({ error: "Your clearance has been revoked and access is terminated." });
    }
    if (user.status === "suspended") {
      return res.status(403).json({ error: "Your account clearance has been suspended. Please contact an Admin." });
    }

    const { password: _, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;
    next();
  });
}

// -----------------------------------------------------
// Auth Endpoints
// -----------------------------------------------------

// Verify active token
app.get("/api/auth/me", authenticateToken, (req: any, res) => {
  res.json({ user: req.user });
});

// Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = loadDB();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user || !user.password) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (user.status === "suspended") {
    return res.status(403).json({ error: "Your account clearance has been suspended. Please contact an Admin." });
  }

  const validPassword = bcryptjs.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // Create JWT
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  const { password: _, ...userWithoutPassword } = user;
  res.json({
    token,
    user: userWithoutPassword
  });
});

// Create Staff / Manager User (Manager only)
app.post("/api/auth/register", authenticateToken, (req: any, res) => {
  const { name, email, password, role } = req.body;

  if (req.user.role !== UserRole.MANAGER) {
    return res.status(403).json({ error: "Only Managers can manage team members." });
  }

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const db = loadDB();
  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "User with this email already exists" });
  }

  if (!Object.values(UserRole).includes(role as UserRole)) {
    return res.status(400).json({ error: "Invalid user role specified" });
  }

  const salt = bcryptjs.genSaltSync(10);
  const hashedPassword = bcryptjs.hashSync(password, salt);

  const newUser = {
    id: "u-" + Math.floor(Math.random() * 1000000),
    name,
    email,
    role: role as UserRole,
    password: hashedPassword,
    status: "active" as const
  };

  db.users.push(newUser);
  saveDB();

  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json({
    message: "Team member registered successfully",
    user: userWithoutPassword
  });
});

// Delete team member (Manager only)
app.delete("/api/users/:userId", authenticateToken, (req: any, res) => {
  if (req.user.role !== UserRole.MANAGER) {
    return res.status(403).json({ error: "Only Managers can perform clearance actions." });
  }

  const db = loadDB();
  const targetUser = db.users.find((u) => u.id === req.params.userId);

  if (!targetUser) {
    return res.status(404).json({ error: "User not found" });
  }

  if (req.params.userId === req.user.id) {
    return res.status(400).json({ error: "You cannot delete yourself!" });
  }

  const userIndex = db.users.findIndex((u) => u.id === req.params.userId);
  if (userIndex !== -1) {
    db.users.splice(userIndex, 1);
    
    // Auto-unassign complaints that were assigned to this deleted user
    db.complaints = db.complaints.map((comp) => {
      if (comp.assignedStaff === req.params.userId) {
        return {
          ...comp,
          assignedStaff: "Unassigned",
          updatedAt: new Date().toISOString()
        };
      }
      return comp;
    });

    saveDB();
  }
  res.json({ message: "Team member deleted successfully and all their assigned tickets have been returned to the unassigned pool." });
});

// Update team member (Manager only)
app.put("/api/users/:userId", authenticateToken, (req: any, res) => {
  if (req.user.role !== UserRole.MANAGER) {
    return res.status(403).json({ error: "Only Managers can perform clearance modifications." });
  }

  const { name, email, role, status, password } = req.body;

  if (!name || !name.trim() || !email || !email.trim() || !role) {
    return res.status(400).json({ error: "Name, email, and role are required." });
  }

  if (password !== undefined && password !== "") {
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Security passwords must consist of at least 6 characters." });
    }
  }

  const db = loadDB();
  const targetUserIndex = db.users.findIndex((u) => u.id === req.params.userId);

  if (targetUserIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  const targetUser = db.users[targetUserIndex];

  // Check if self-demotion or self-suspension was attempted
  if (targetUser.id === req.user.id) {
    if (role !== targetUser.role) {
      return res.status(400).json({ error: "You cannot change your own role to prevent system administrative lockout." });
    }
    if (status === "suspended") {
      return res.status(400).json({ error: "You cannot suspend your own clearance." });
    }
  }

  // Check for duplicate email (if email is changing)
  if (email.toLowerCase() !== targetUser.email.toLowerCase()) {
    const emailDup = db.users.find((u) => u.id !== targetUser.id && u.email.toLowerCase() === email.toLowerCase());
    if (emailDup) {
      return res.status(400).json({ error: "Another user is already registered with this email address." });
    }
  }

  // Apply updates
  targetUser.name = name.trim();
  targetUser.email = email.trim();
  targetUser.role = role as UserRole;
  targetUser.status = status as "active" | "suspended";

  if (password !== undefined && password !== "") {
    const salt = bcryptjs.genSaltSync(10);
    targetUser.password = bcryptjs.hashSync(password, salt);
  }

  db.users[targetUserIndex] = targetUser;
  saveDB();

  const { password: _, ...userWithoutPassword } = targetUser;
  res.json({
    message: "Team profile updated successfully",
    user: userWithoutPassword
  });
});

// Get Staff Members & Managers
app.get("/api/users/staff", authenticateToken, (req, res) => {
  const db = loadDB();
  // Return list of staff and managers for assignment purposes (passwords excluded)
  const staffMembers = db.users
    .filter((u) => u.role === UserRole.STAFF || u.role === UserRole.MANAGER || u.role === UserRole.ADMIN)
    .map(({ password, ...u }) => u);
  res.json(staffMembers);
});

// -----------------------------------------------------
// Complaints Endpoints
// -----------------------------------------------------

// Get all complaints with real-time escalation sweeps
app.get("/api/complaints", authenticateToken, (req: any, res) => {
  // First run high-precision escalation check so returned states are up-to-date
  checkSLAEscalations();

  const db = loadDB();
  let complaints = [...db.complaints];

  // Role based filtering
  // Admins & Managers can see all complaints.
  // Staff members can only see complaints assigned directly to them.
  if (req.user.role === UserRole.STAFF) {
    complaints = complaints.filter((c) => c.assignedStaff === req.user.id);
  }

  res.json(complaints);
});

// Create Complaint
app.post("/api/complaints", authenticateToken, (req: any, res) => {
  const { customerName, phone, email, category, description, priority, assignedStaff } = req.body;

  if (!customerName || !phone || !email || !category || !description || !priority) {
    return res.status(400).json({ error: "Required fields are missing." });
  }

  if (!assignedStaff || assignedStaff === "Unassigned") {
    return res.status(400).json({ error: "Please assign a staff member. A ticket cannot be logged without an assigned agent." });
  }

  const db = loadDB();

  // Generate Complaint ID e.g. MVT-1005 (find max ticket suffix)
  let maxNum = 1000;
  db.complaints.forEach((c) => {
    const match = c.complaintId.match(/MVT-(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      if (num > maxNum) maxNum = num;
    }
  });
  const newComplaintId = `MVT-${maxNum + 1}`;

  const now = new Date().toISOString();
  const slaDeadline = getSLADeadline(now);

  const newComplaint = {
    id: "c-" + Math.floor(Math.random() * 1000000),
    complaintId: newComplaintId,
    customerName,
    phone,
    email,
    category,
    description,
    priority: priority as ComplaintPriority,
    status: ComplaintStatus.OPEN,
    assignedStaff: assignedStaff || "Unassigned",
    createdAt: now,
    updatedAt: now,
    slaDeadline
  };

  db.complaints.push(newComplaint);

  // In-app Notification for assigned staff
  if (assignedStaff && assignedStaff !== "Unassigned") {
    db.notifications.push({
      id: "nt-" + Math.floor(Math.random() * 1000000),
      userId: assignedStaff,
      message: `📥 NEW ASSIGNMENT: Complaint ${newComplaintId} (${customerName}) is assigned to you.`,
      status: "unread",
      createdAt: now,
      complaintId: newComplaintId
    });
  }

  // Broad alert notification for critical and high priority complaints
  if (priority === ComplaintPriority.CRITICAL || priority === ComplaintPriority.HIGH) {
    db.notifications.push({
      id: "nt-" + Math.floor(Math.random() * 1000000),
      userId: "all",
      message: `⚠️ URGENT COMPLAINT: ${newComplaintId} (${customerName}) logged with ${priority.toUpperCase()} priority!`,
      status: "unread",
      createdAt: now,
      complaintId: newComplaintId
    });
  }

  saveDB();
  res.status(201).json(newComplaint);
});

// Get single complaint with its Notes, Escalations & Full History Timeline
app.get("/api/complaints/:complaintId", authenticateToken, (req: any, res) => {
  // First update states
  checkSLAEscalations();

  const db = loadDB();
  const comp = db.complaints.find((c) => c.complaintId === req.params.complaintId);

  if (!comp) {
    return res.status(404).json({ error: "Complaint not found" });
  }

  // Role validation
  if (req.user.role === UserRole.STAFF && comp.assignedStaff !== req.user.id) {
    return res.status(403).json({ error: "Access denied. This ticket is assigned to another staff member." });
  }

  // Get matching Notes and Escalations
  const notes = db.notes.filter((n) => n.complaintId === comp.complaintId);
  const escalations = db.escalations.filter((e) => e.complaintId === comp.complaintId);

  res.json({
    complaint: comp,
    notes,
    escalations
  });
});

// Update complaint status, assign staff, or resolve
app.put("/api/complaints/:complaintId", authenticateToken, (req: any, res) => {
  const { status, assignedStaff, priority } = req.body;
  const db = loadDB();
  const index = db.complaints.findIndex((c) => c.complaintId === req.params.complaintId);

  if (index === -1) {
    return res.status(404).json({ error: "Complaint not found" });
  }

  const comp = db.complaints[index];
  const now = new Date().toISOString();

  // Permissions guard
  if (req.user.role === UserRole.STAFF && comp.assignedStaff !== req.user.id) {
    return res.status(403).json({ error: "Access denied. Ticket is assigned to another agent." });
  }

  // Check if status changed
  if (status && status !== comp.status) {
    // Audit timeline change using the notes field
    const noteId = "n-" + Math.floor(Math.random() * 1000000);
    db.notes.push({
      id: noteId,
      complaintId: comp.complaintId,
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.role,
      note: `🔧 Ticket status updated from "${comp.status}" to "${status}"`,
      createdAt: now
    });

    comp.status = status as ComplaintStatus;

    if (status === ComplaintStatus.RESOLVED) {
      comp.resolvedAt = now;
      
      // Notify managers
      db.notifications.push({
        id: "nt-" + Math.floor(Math.random() * 1000000),
        userId: "all",
        message: `✅ RESOLVED: Complaint ${comp.complaintId} has been successfully closed by ${req.user.name}.`,
        status: "unread",
        createdAt: now,
        complaintId: comp.complaintId
      });
    } else {
      // If reopened or changed back, clear resolvedAt
      comp.resolvedAt = undefined;
    }
  }

  // Check if assigned staff changed
  if (assignedStaff && assignedStaff !== comp.assignedStaff) {
    const prevStaff = db.users.find((u) => u.id === comp.assignedStaff)?.name || "Unassigned";
    const nextStaffName = db.users.find((u) => u.id === assignedStaff)?.name || "Unassigned";

    const noteId = "n-" + Math.floor(Math.random() * 1000000);
    db.notes.push({
      id: noteId,
      complaintId: comp.complaintId,
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.role,
      note: `👤 Assigned staff changed from "${prevStaff}" to "${nextStaffName}"`,
      createdAt: now
    });

    comp.assignedStaff = assignedStaff;

    // Send assignment notification to the newly assigned user
    if (assignedStaff !== "Unassigned") {
      db.notifications.push({
        id: "nt-" + Math.floor(Math.random() * 1000000),
        userId: assignedStaff,
        message: `📥 ASSIGNMENT CHANGE: Complaint ${comp.complaintId} has been assigned to you.`,
        status: "unread",
        createdAt: now,
        complaintId: comp.complaintId
      });
    }
  }

  // Edit Priority (Admin / Manager only)
  if (priority && priority !== comp.priority) {
    if (req.user.role === UserRole.STAFF) {
      return res.status(403).json({ error: "Staff members cannot modify complaint priority." });
    }

    const noteId = "n-" + Math.floor(Math.random() * 1000000);
    db.notes.push({
      id: noteId,
      complaintId: comp.complaintId,
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.role,
      note: `⚡ Priority level updated to "${priority.toUpperCase()}"`,
      createdAt: now
    });

    comp.priority = priority as ComplaintPriority;
  }

  comp.updatedAt = now;
  db.complaints[index] = comp;
  saveDB();

  res.json({
    complaint: comp,
    notes: db.notes.filter((n) => n.complaintId === comp.complaintId)
  });
});

// Delete complaint (Admin and Manager only)
app.delete("/api/complaints/:complaintId", authenticateToken, (req: any, res) => {
  if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.MANAGER) {
    return res.status(403).json({ error: "Only global Admins and Managers can delete complaints." });
  }

  const db = loadDB();
  const compIndex = db.complaints.findIndex((c) => c.complaintId === req.params.complaintId);

  if (compIndex === -1) {
    return res.status(404).json({ error: "Complaint not found" });
  }

  const comp = db.complaints[compIndex];

  // Remove corresponding notes and escalations to save disk storage
  db.complaints.splice(compIndex, 1);
  db.notes = db.notes.filter((n) => n.complaintId !== comp.complaintId);
  db.escalations = db.escalations.filter((e) => e.complaintId !== comp.complaintId);
  db.notifications = db.notifications.filter((nt) => nt.complaintId !== comp.complaintId);

  saveDB();
  res.json({ message: "Complaint ticket deleted successfully" });
});

// Add Staff Note to Complaint
app.post("/api/complaints/:complaintId/notes", authenticateToken, (req: any, res) => {
  const { note } = req.body;
  if (!note || note.trim() === "") {
    return res.status(400).json({ error: "Note text is required." });
  }

  const db = loadDB();
  const comp = db.complaints.find((c) => c.complaintId === req.params.complaintId);

  if (!comp) {
    return res.status(404).json({ error: "Complaint not found" });
  }

  // Protection
  if (req.user.role === UserRole.STAFF && comp.assignedStaff !== req.user.id) {
    return res.status(403).json({ error: "You can only comment on tickets active in your workflow." });
  }

  const now = new Date().toISOString();
  const noteId = "n-" + Math.floor(Math.random() * 1000000);

  const newNote = {
    id: noteId,
    complaintId: comp.complaintId,
    userId: req.user.id,
    userName: req.user.name,
    role: req.user.role,
    note,
    createdAt: now
  };

  db.notes.push(newNote);
  
  comp.updatedAt = now;
  saveDB();

  res.status(201).json(newNote);
});

// -----------------------------------------------------
// Notification Endpoints
// -----------------------------------------------------

// Get active notifications
app.get("/api/notifications", authenticateToken, (req: any, res) => {
  const db = loadDB();
  const activeUserNotifs = db.notifications.filter(
    (n) => n.userId === req.user.id || n.userId === "all"
  );
  // Sort reverse chronological
  activeUserNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(activeUserNotifs);
});

// Mark notification as read
app.put("/api/notifications/:id/read", authenticateToken, (req, res) => {
  const db = loadDB();
  const notif = db.notifications.find((n) => n.id === req.params.id);
  
  if (!notif) {
    return res.status(404).json({ error: "Notification not found" });
  }

  notif.status = "read";
  saveDB();
  res.json({ message: "Notification marked as read" });
});

// Mark all notifications for a user as read
app.post("/api/notifications/read-all", authenticateToken, (req: any, res) => {
  const db = loadDB();
  db.notifications = db.notifications.map((n) => {
    if (n.userId === req.user.id || n.userId === "all") {
      n.status = "read";
    }
    return n;
  });
  saveDB();
  res.json({ message: "All notifications marked as read" });
});

// -----------------------------------------------------
// Reporting & Analytics Endpoint
// -----------------------------------------------------
app.get("/api/reports/analytics", authenticateToken, (req: any, res) => {
  checkSLAEscalations();

  const db = loadDB();
  const complaints = db.complaints;

  const total = complaints.length;
  const open = complaints.filter((c) => c.status === ComplaintStatus.OPEN).length;
  const inProgress = complaints.filter((c) => c.status === ComplaintStatus.IN_PROGRESS).length;
  const escalated = complaints.filter((c) => c.status === ComplaintStatus.ESCALATED).length;
  const resolved = complaints.filter((c) => c.status === ComplaintStatus.RESOLVED).length;

  // Category Distribution
  const categories: Record<string, number> = {};
  complaints.forEach((c) => {
    categories[c.category] = (categories[c.category] || 0) + 1;
  });

  // Priority Distribution
  const priorities = {
    [ComplaintPriority.LOW]: complaints.filter((c) => c.priority === ComplaintPriority.LOW).length,
    [ComplaintPriority.MEDIUM]: complaints.filter((c) => c.priority === ComplaintPriority.MEDIUM).length,
    [ComplaintPriority.HIGH]: complaints.filter((c) => c.priority === ComplaintPriority.HIGH).length,
    [ComplaintPriority.CRITICAL]: complaints.filter((c) => c.priority === ComplaintPriority.CRITICAL).length
  };

  // Average Resolution Time in Hours
  let totalResTimeMs = 0;
  let resolvedWithTimes = 0;
  complaints.forEach((c) => {
    if (c.status === ComplaintStatus.RESOLVED && c.resolvedAt) {
      const created = new Date(c.createdAt).getTime();
      const resolved = new Date(c.resolvedAt).getTime();
      const diff = resolved - created;
      if (diff > 0) {
        totalResTimeMs += diff;
        resolvedWithTimes++;
      }
    }
  });

  const avgResolutionTimeHours = resolvedWithTimes > 0 
    ? parseFloat((totalResTimeMs / (1000 * 60 * 60) / resolvedWithTimes).toFixed(1)) 
    : 0;

  // Escalation Rate: % of all complaints created that breached SLA and marked escalated
  // Escalated complaints or any complaint that has an associated escalation record 
  const distinctEscalatedTicketIds = new Set(db.escalations.map((e) => e.complaintId));
  const totalEverEscalated = distinctEscalatedTicketIds.size;
  const escalationRate = total > 0 ? parseFloat(((totalEverEscalated / total) * 100).toFixed(1)) : 0;

  // Resolution Rate
  const resolutionRate = total > 0 ? parseFloat(((resolved / total) * 100).toFixed(1)) : 0;

  // Staff Performance Metrics
  const staffPerformance = db.users
    .filter((u) => u.role === UserRole.STAFF || u.role === UserRole.ADMIN || u.role === UserRole.MANAGER)
    .map((usr) => {
      const staffTickets = complaints.filter((c) => c.assignedStaff === usr.id);
      const totalStaff = staffTickets.length;
      const resolvedStaff = staffTickets.filter((c) => c.status === ComplaintStatus.RESOLVED).length;
      const escalatedStaff = staffTickets.filter((c) => c.status === ComplaintStatus.ESCALATED).length;
      const activeStaff = staffTickets.filter(
        (c) => c.status === ComplaintStatus.OPEN || c.status === ComplaintStatus.IN_PROGRESS
      ).length;

      return {
        staffId: usr.id,
        staffName: usr.name,
        staffEmail: usr.email,
        role: usr.role,
        assignedTicketsCount: totalStaff,
        resolvedTicketsCount: resolvedStaff,
        escalatedTicketsCount: escalatedStaff,
        activeTicketsCount: activeStaff,
        resolutionPercentage: totalStaff > 0 ? parseFloat(((resolvedStaff / totalStaff) * 100).toFixed(0)) : 100
      };
    });

  // Monthly trends - count complaints created per calendar month
  const monthlyTrends: Record<string, number> = {};
  complaints.forEach((c) => {
    try {
      const d = new Date(c.createdAt);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      monthlyTrends[key] = (monthlyTrends[key] || 0) + 1;
    } catch {
      // Ignored
    }
  });

  res.json({
    stats: {
      total,
      open,
      inProgress,
      escalated,
      resolved,
      resolutionRate,
      escalationRate,
      avgResolutionTimeHours
    },
    categoryDistribution: Object.entries(categories).map(([name, value]) => ({ name, value })),
    priorityDistribution: Object.entries(priorities).map(([name, value]) => ({ name, value })),
    staffPerformance,
    monthlyTrends: Object.entries(monthlyTrends).map(([name, value]) => ({ name, value }))
  });
});

// -----------------------------------------------------
// Frontend integration and serving
// -----------------------------------------------------

// Mount Vite in development, static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 [Manivtha Tours API] Server successfully booted and running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
