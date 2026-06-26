# Customer Complaint Escalation & Resolution Timer
### Operational SLA Framework for **Manivtha Tours & Travels**

This is an enterprise-grade full-stack complaint management and resolution tracking dashboard. It features a robust **4-hour SLA Countdown Timer**, an automatic background **Escalation Engine**, role-based accessibility, chronological transaction timelines, operational comments, and high-fidelity performance reporting.

---

## 🚀 Main Architectural Features

### 1. Unified SLA Countdown Clock
Every complaint initializes a precise **4-hour SLA countdown timer** upon registration. 
* **State Preservation**: The tick timers calculate remaining seconds based on the discrepancy between the database `createdAt` timestamp and the system clock. Timer progress is preserved across page reloads, browser state clearings, or server reboot events.
* **Proactive Visual Indicators**: Dynamic warnings appear inside lists and detail pages. If time remaining falls below 30 minutes, tickets show warning pulsing highlights.

### 2. Auto-Escalation Ticker
If a complaint remains in `Open` or `In Progress` state for more than 4, hours:
* **Background Verification**: A server-side interval sweep inspects complaints every 30 seconds.
* **On-Demand Validation**: Every standard read API call prompts a validation sweep to guarantee real-time SLA evaluations.
* **Dynamic Interventions**: Expired tickets are tagged as `Escalated`, managers and supervisors receive real-time alerts, and a system audit event is recorded in the ticket's history timeline.

### 3. Role-Based Access Controls (RBAC)
* **Administrator**: Full system visibility. Can log new tickets, assign representatives, modify priorities, delete obsolete entries, and register secondary team members.
* **Supervisor / Manager**: Mid-level access. Oversees SLAs, reviews escalations, and accesses the analytical performance console to monitor staff resolution ratios.
* **Staff Agent**: Restrictive focus workflow. Sees only direct ticket assignments, posts active notes, and ticks tasks as resolved.

### 4. Interactive Reporting & Analytics
* Compiled charts utilizing clean vector SVGs to avoid package conflicts.
* Features a breakdown of Categories, monthly tracking trends, and detailed staff performance KPIs.
* **High-Fidelity Downloads**: Compiled on-the-fly, downloading a clean spreadsheet report (.csv) layout instantly.

---

## 📁 Project Folder Structure
```text
├── /db.json                  # Persistent server-side database storage cache
├── /index.html               # Main website entry page
├── /metadata.json            # Application name and frame properties
├── /server.ts                # Express backend REST APIs & Vite server integration
├── /tsconfig.json            # TypeScript build parameters
├── /vite.config.ts           # Bundler plugins & file indicators
├── /src/
│   ├── App.tsx               # Primary interface router and polling loop
│   ├── index.css             # Fluid Tailwind directives and Google Web Fonts
│   ├── main.tsx              # React mounting root
│   ├── types.ts              # Universal shared schema interfaces and enums
│   └── components/
│       ├── LoginView.tsx           # Authentication portal with test accounts
│       ├── DashboardView.tsx       # Live queue table, multi-filters, and ticket log drawer
│       ├── ComplaintDetailsView.tsx# Chronological timeline, comments, and status toggles
│       ├── AnalyticsView.tsx       # SVG KPI dashboards & CSV compilation scripts
│       └── TeamManagementView.tsx   # Admin directories and staff registrations card
```

---

## 🛢️ Database Schema
The server relies on `/db.json` for persistent storage, making the applet fast and self-contained. For your local production setup with **MySQL**, compile following SQL schemas:

```sql
-- 1. Create Users Table
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff', 'manager') DEFAULT 'staff',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Complaints Table
CREATE TABLE complaints (
  id VARCHAR(50) PRIMARY KEY,
  complaintId VARCHAR(30) NOT NULL UNIQUE,
  customerName VARCHAR(100) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  status ENUM('open', 'in_progress', 'escalated', 'resolved') DEFAULT 'open',
  assignedStaff VARCHAR(50) DEFAULT 'Unassigned',
  createdAt TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP NOT NULL,
  resolvedAt TIMESTAMP NULL,
  slaDeadline TIMESTAMP NOT NULL,
  escalatedAt TIMESTAMP NULL,
  FOREIGN KEY (assignedStaff) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Create Escalations Table
CREATE TABLE escalations (
  id VARCHAR(50) PRIMARY KEY,
  complaintId VARCHAR(30) NOT NULL,
  escalationTime TIMESTAMP NOT NULL,
  escalationReason TEXT NOT NULL,
  FOREIGN KEY (complaintId) REFERENCES complaints(complaintId) ON DELETE CASCADE
);

-- 4. Create Notes Table
CREATE TABLE notes (
  id VARCHAR(50) PRIMARY KEY,
  complaintId VARCHAR(30) NOT NULL,
  userId VARCHAR(50) NOT NULL,
  userName VARCHAR(100) NOT NULL,
  role VARCHAR(30) NOT NULL,
  note TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaintId) REFERENCES complaints(complaintId) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Create Notifications Table
CREATE TABLE notifications (
  id VARCHAR(50) PRIMARY KEY,
  userId VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('unread', 'read') DEFAULT 'unread',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  complaintId VARCHAR(30) DEFAULT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 🔌 Core Rest API Routes

### Authentication
* `POST /api/auth/login` - Authenticates user & responds with custom JWT.
* `GET /api/auth/me` - Validates the active authorization token.
* `POST /api/auth/register` - *[Admin Only]* Creates a new team member with hashed passwords.

### Complaints
* `GET /api/complaints` - Triggers an SLA sweep and fetches available tickets.
* `POST /api/complaints` - Registers a new ticket and sends in-app notifications.
* `GET /api/complaints/:complaintId` - Pulls details, timeline, and staff comments.
* `PUT /api/complaints/:complaintId` - Modifies team assignments, priorities, or resolves tickets.
* `DELETE /api/complaints/:complaintId` - *[Admin Only]* Clears a ticket and its history.

### Notes & Timeline
* `POST /api/complaints/:complaintId/notes` - Submits a comment or action note.

### Notifications
* `GET /api/notifications` - Lists standard alerts and critical notifications for the active session.
* `PUT /api/notifications/:id/read` - Marks an individual banner alert as read.
* `POST /api/notifications/read-all` - Clears entire notifications tray.

### Analytics
* `GET /api/reports/analytics` - Computes aggregate ticket workloads, resolution durations, and staff evaluations.

---

## 🛠️ Step-By-Step Local Deployment Guide

Follow these steps to run this application locally on your computer:

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **npm** installed on your operating system.

### 2. Extraction & Installation
Copy the repository files into a directory, open your terminal, and install the modules:
```bash
npm install
```

### 3. Add Environment Configurations
Create a `.env` configuration file in the project's root folder:
```env
PORT=3000
JWT_SECRET="any_secure_token_key_here"
```

### 4. Running the Development Server
Launch the application with node TSX compilation:
```bash
npm run dev
```
The server will boot and bind to `http://localhost:3000`. Navigate to this URL in your web browser.

### 5. Compiling for Production
Bundle the client assets and compile the Express server into CJS using esbuild:
```bash
npm run build
```
Launch the compiled standalone build:
```bash
npm run start
```
The application runs entirely independent of development bundlers in production-ready speeds!
