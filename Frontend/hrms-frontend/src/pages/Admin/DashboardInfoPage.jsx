import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gift,
  Users,
  Bell,
} from "lucide-react";
import "./DashboardInfoPage.css";

const INFO = {
  pending: {
    title: "Pending Requests",
    subtitle: "Requests currently awaiting administrative action.",
    icon: ClipboardList,
    metrics: [
      ["Total pending", "384"],
      ["High priority", "17"],
      ["Updated today", "42"],
    ],
  },
  alerts: {
    title: "Process Alerts",
    subtitle: "Operational issues and alerts requiring attention.",
    icon: CheckCircle2,
    metrics: [
      ["Active alerts", "28"],
      ["Critical", "3"],
      ["Resolved today", "11"],
    ],
  },
  events: {
    title: "Today's Events",
    subtitle: "Today's HR and organization events.",
    icon: CalendarDays,
    metrics: [
      ["Events today", "0"],
      ["Upcoming", "6"],
      ["Completed", "0"],
    ],
  },
  issues: {
    title: "Setup Issues",
    subtitle: "Configuration items that may need administrative attention.",
    icon: CheckCircle2,
    metrics: [
      ["Open issues", "2"],
      ["Critical", "0"],
      ["Resolved", "5"],
    ],
  },
  "department-distribution": {
    title: "Department Distribution",
    subtitle: "Current employee distribution across departments.",
    icon: Users,
    metrics: [
      ["Total employees", "73"],
      ["Operations", "60"],
      ["Human Resources", "13"],
    ],
  },
  "employee-head-count": {
    title: "Employee Head Count",
    subtitle: "Monthly active and inactive employee summary.",
    icon: BarChart3,
    metrics: [
      ["Active", "69"],
      ["Inactive", "8"],
      ["Net change", "+6"],
    ],
  },
  "joiners-resigned": {
    title: "New Joinee / Resigned Employees",
    subtitle: "Recent employee movement across the organization.",
    icon: Users,
    metrics: [
      ["New joinees", "9"],
      ["Resigned", "0"],
      ["Net movement", "+9"],
    ],
  },
  "birthdays-events": {
    title: "Birthdays & Work Anniversaries",
    subtitle: "Employee celebrations and milestone events.",
    icon: Gift,
    metrics: [
      ["Birthdays today", "0"],
      ["Anniversaries today", "0"],
      ["Upcoming", "4"],
    ],
  },
  holidays: {
    title: "Holiday Information",
    subtitle: "Company holiday schedule and upcoming dates.",
    icon: CalendarDays,
    metrics: [
      ["Upcoming holidays", "1"],
      ["This month", "1"],
      ["Next holiday", "27 Aug"],
    ],
  },
  "special-events": {
    title: "Special Events",
    subtitle: "Company events and scheduled activities.",
    icon: Gift,
    metrics: [
      ["Upcoming", "0"],
      ["This month", "0"],
      ["Completed", "3"],
    ],
  },
  "employee-feeds": {
    title: "Employee Feeds",
    subtitle: "Latest employee announcements and social updates.",
    icon: FileText,
    metrics: [
      ["Posts loaded", "7"],
      ["Today", "2"],
      ["Comments", "0"],
    ],
  },
  "notification-n1": {
    title: "Process Alert",
    subtitle: "Detailed view of the selected notification.",
    icon: Bell,
    metrics: [
      ["Status", "Unread"],
      ["Priority", "High"],
      ["Age", "10 min"],
    ],
  },
  "notification-n2": {
    title: "Regularization Request",
    subtitle: "Detailed view of the pending regularization notification.",
    icon: Bell,
    metrics: [
      ["Status", "Pending"],
      ["Priority", "Normal"],
      ["Age", "1 hr"],
    ],
  },
  "notification-n3": {
    title: "Announcement Update",
    subtitle: "Office timing announcement notification details.",
    icon: Bell,
    metrics: [
      ["Status", "Read"],
      ["Category", "Announcement"],
      ["Age", "3 hr"],
    ],
  },
  "notification-n4": {
    title: "Holiday Reminder",
    subtitle: "Upcoming holiday notification details.",
    icon: Bell,
    metrics: [
      ["Status", "Read"],
      ["Category", "Holiday"],
      ["Age", "Yesterday"],
    ],
  },
  "announcement-a1": {
    title: "Budget 2025 Announcement",
    subtitle: "Budget and tax relief announcement.",
    icon: FileText,
    metrics: [
      ["Published", "10 Apr, 2025"],
      ["Category", "Announcement"],
      ["Status", "Published"],
    ],
  },
  "announcement-a2": {
    title: "Office Timings Announcement",
    subtitle: "Updated office timings information.",
    icon: FileText,
    metrics: [
      ["Published", "2 Apr, 2024"],
      ["Category", "Announcement"],
      ["Status", "Published"],
    ],
  },
  "announcement-a3": {
    title: "Email Backup Announcement",
    subtitle: "Email backup and continuity information.",
    icon: FileText,
    metrics: [
      ["Published", "4 Aug, 2023"],
      ["Category", "Announcement"],
      ["Status", "Published"],
    ],
  },
};

const fallback = {
  title: "Dashboard Information",
  subtitle: "Detailed information for this dashboard section.",
  icon: FileText,
  metrics: [
    ["Status", "Available"],
    ["Records", "—"],
    ["Last updated", "Today"],
  ],
};

export default function DashboardInfoPage() {
  const navigate = useNavigate();
  const { section, id } = useParams();

  let key = section;
  if (section === "notification") key = `notification-${id}`;
  if (section === "announcement") key = `announcement-${id}`;

  const data = INFO[key] || fallback;
  const Icon = data.icon;

  return (
    <div className="dashboard-info-page">
      <div className="dashboard-info-shell">
        <section className="dashboard-info-metrics">
          {data.metrics.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </section>

        <section className="dashboard-info-card">
          <span className="dashboard-info-kicker">DETAILS</span>
          <h2>{data.title} overview</h2>
          <p>
            This dedicated information page is connected to the dashboard
            interaction and is ready to be backed by the corresponding API
            dataset. Your existing dashboard data and navigation remain
            unchanged.
          </p>

          <div className="dashboard-info-placeholder">
            <CheckCircle2 size={20} />
            <span>Section is available and routed correctly.</span>
          </div>
        </section>
      </div>
    </div>
  );
}
