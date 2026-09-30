import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft as PiArrowLeftDuotone,
  ArrowRight as PiArrowRightDuotone,
  Bell as PiBellRingingDuotone,
  CalendarCheck as PiCalendarCheckDuotone,
  CheckCircle2 as PiCheckCircleDuotone,
  Clock as PiClockDuotone,
  ClipboardList as PiClipboardTextDuotone,
  AlertTriangle as PiCloudWarningDuotone,
  Search as PiMagnifyingGlassDuotone,
  User as PiPersonDuotone,
  UsersRound as PiUsersThreeDuotone,
  XCircle as PiXCircleDuotone,
  X as PiXDuotone,
  RefreshCw as PiArrowsClockwiseDuotone,
  Settings as PiGearDuotone,
  ShieldAlert as PiShieldWarningDuotone,
  Filter as PiFunnelDuotone,
  Info as PiInfoDuotone,
  Check as PiCheckDuotone,
} from "lucide-react";

import "./AlertPage.css";

/* =========================================================
   ALERT DATA
   ========================================================= */

const INITIAL_ALERTS = {
  pending: [
    {
      id: "leave-approval",
      title: "Pending Leave Approval Requests",
      shortTitle: "Leave Approval",
      count: 43,
      description:
        "Leave requests are waiting for administrative review and approval.",
      status: "Pending",
      severity: "High",
      actionType: "approval",
      icon: PiCalendarCheckDuotone,
      color: "purple",
      updated: "Today, 04:32 PM",
      source: "Leave Management",
      employees: 31,
      department: "Multiple Departments",
      records: [
        {
          employee: "Ananya Sharma",
          employeeId: "EMP-1024",
          department: "Human Resources",
          requestType: "Casual Leave",
          submitted: "31 Aug 2026, 10:42 AM",
          from: "02 Sep 2026",
          to: "03 Sep 2026",
          days: 2,
          status: "Pending Approval",
        },
        {
          employee: "Rahul Mehta",
          employeeId: "EMP-1087",
          department: "Operations",
          requestType: "Earned Leave",
          submitted: "31 Aug 2026, 11:18 AM",
          from: "04 Sep 2026",
          to: "06 Sep 2026",
          days: 3,
          status: "Pending Approval",
        },
      ],
    },

    {
      id: "leave-cancellation",
      title: "Pending Leave Cancellation Requests",
      shortTitle: "Leave Cancellation",
      count: 1,
      displayCount: "01",
      description:
        "Employees have submitted leave cancellation requests awaiting review.",
      status: "Pending",
      severity: "Medium",
      actionType: "approval",
      icon: PiCalendarCheckDuotone,
      color: "blue",
      updated: "Today, 03:48 PM",
      source: "Leave Management",
      employees: 1,
      department: "Finance",
      records: [
        {
          employee: "Priya Kapoor",
          employeeId: "EMP-1042",
          department: "Finance",
          requestType: "Leave Cancellation",
          submitted: "31 Aug 2026, 02:14 PM",
          from: "05 Sep 2026",
          to: "05 Sep 2026",
          days: 1,
          status: "Pending Review",
        },
      ],
    },

    {
      id: "comp-off",
      title: "Pending Comp-Off Requests",
      shortTitle: "Comp-Off Requests",
      count: 8,
      displayCount: "08",
      description:
        "Compensatory off requests are waiting for administrator action.",
      status: "Pending",
      severity: "Medium",
      actionType: "approval",
      icon: PiClipboardTextDuotone,
      color: "orange",
      updated: "Today, 03:12 PM",
      source: "Attendance",
      employees: 8,
      department: "Operations",
      records: [
        {
          employee: "Vikram Singh",
          employeeId: "EMP-1019",
          department: "Operations",
          requestType: "Compensatory Off",
          submitted: "30 Aug 2026, 05:22 PM",
          from: "01 Sep 2026",
          to: "01 Sep 2026",
          days: 1,
          status: "Pending Approval",
        },
        {
          employee: "Neha Verma",
          employeeId: "EMP-1118",
          department: "Customer Support",
          requestType: "Compensatory Off",
          submitted: "31 Aug 2026, 09:41 AM",
          from: "03 Sep 2026",
          to: "03 Sep 2026",
          days: 1,
          status: "Pending Approval",
        },
      ],
    },

    {
      id: "regularization",
      title: "Pending Regularization Requests",
      shortTitle: "Regularization",
      count: 4,
      displayCount: "04",
      description:
        "Attendance regularization requests require administrator verification.",
      status: "Pending",
      severity: "High",
      actionType: "approval",
      icon: PiClockDuotone,
      color: "pink",
      updated: "Today, 02:55 PM",
      source: "Attendance",
      employees: 4,
      department: "Multiple Departments",
      records: [
        {
          employee: "Amit Patel",
          employeeId: "EMP-1093",
          department: "Sales",
          requestType: "Attendance Regularization",
          submitted: "31 Aug 2026, 08:52 AM",
          from: "29 Aug 2026",
          to: "29 Aug 2026",
          days: 1,
          status: "Pending Review",
        },
        {
          employee: "Sana Khan",
          employeeId: "EMP-1131",
          department: "Operations",
          requestType: "Attendance Regularization",
          submitted: "31 Aug 2026, 09:15 AM",
          from: "30 Aug 2026",
          to: "30 Aug 2026",
          days: 1,
          status: "Pending Review",
        },
      ],
    },

    {
      id: "unactivated",
      title: "Employee Unactivated Accounts",
      shortTitle: "Unactivated Accounts",
      count: 3,
      displayCount: "03",
      description:
        "Employee accounts exist in the system but still require activation.",
      status: "Attention",
      severity: "Medium",
      actionType: "activation",
      icon: PiUsersThreeDuotone,
      color: "teal",
      updated: "Today, 01:38 PM",
      source: "Employee Management",
      employees: 3,
      department: "Multiple Departments",
      records: [
        {
          employee: "Karan Joshi",
          employeeId: "EMP-1192",
          department: "IT",
          requestType: "Account Activation",
          submitted: "30 Aug 2026, 04:20 PM",
          from: "—",
          to: "—",
          days: 0,
          status: "Not Activated",
        },
        {
          employee: "Meera Iyer",
          employeeId: "EMP-1195",
          department: "Marketing",
          requestType: "Account Activation",
          submitted: "31 Aug 2026, 10:05 AM",
          from: "—",
          to: "—",
          days: 0,
          status: "Not Activated",
        },
      ],
    },
  ],

  setup: [
    {
      id: "leave-templates",
      title: "Missing Leave Templates",
      shortTitle: "Leave Templates",
      count: 2,
      displayCount: "02",
      description:
        "Two leave templates are missing configuration required for normal leave processing.",
      status: "Configuration Required",
      severity: "Critical",
      icon: PiGearDuotone,
      color: "orange",
      updated: "Detected Today, 12:42 PM",
      source: "Leave Configuration",
      employees: 0,
      department: "Leave Management",
      records: [
        {
          employee: "System Configuration",
          employeeId: "CONFIG-LEAVE",
          department: "Leave Management",
          requestType: "Missing Leave Template",
          submitted: "31 Aug 2026, 12:42 PM",
          from: "—",
          to: "—",
          days: 0,
          status: "Configuration Required",
        },
      ],
    },
  ],

  process: [
    {
      id: "process-review",
      title: "Process alerts require review",
      shortTitle: "Process Alerts",
      count: 28,
      displayCount: "28",
      description:
        "There are active process alerts in the HRMS dashboard. Review them to ensure workflows continue without interruption.",
      status: "Active",
      severity: "High",
      icon: PiShieldWarningDuotone,
      color: "pink",
      updated: "Updated Today, 04:48 PM",
      source: "HRMS Process Monitor",
      employees: 28,
      department: "System Wide",
      records: [
        {
          employee: "HRMS Process Monitor",
          employeeId: "SYSTEM-001",
          department: "System Wide",
          requestType: "Process Alert",
          submitted: "31 Aug 2026, 04:48 PM",
          from: "—",
          to: "—",
          days: 0,
          status: "Active",
        },
      ],
    },
  ],
};

/* =========================================================
   HELPERS
   ========================================================= */

const formatCount = (value) => {
  if (typeof value === "string") return value;
  return String(value).padStart(2, "0");
};

const getCategoryTotal = (items) =>
  items.reduce((total, item) => total + item.count, 0);

/* =========================================================
   COMPONENT
   ========================================================= */

function AlertPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("pending");
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [actionMessage, setActionMessage] = useState("");

  /* =======================================================
     LOAD / REFRESH
     ======================================================= */

  const refreshAlerts = useCallback(() => {
    setLoading(true);
    setError(false);

    window.setTimeout(() => {
      try {
        setAlerts((current) => ({ ...current }));
        setLoading(false);
        setActionMessage("Alert center refreshed successfully.");
      } catch {
        setLoading(false);
        setError(true);
      }
    }, 650);
  }, []);

  useEffect(() => {
    return () => {
      setActionMessage("");
    };
  }, []);

  /* =======================================================
     CURRENT DATA
     ======================================================= */

  const currentAlerts = useMemo(() => {
    const source = alerts[activeTab] || [];

    return source.filter((alert) => {
      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        alert.title.toLowerCase().includes(query) ||
        alert.description.toLowerCase().includes(query) ||
        alert.source.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        alert.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [alerts, activeTab, search, statusFilter]);

  const totalAlerts =
    getCategoryTotal(alerts.pending) +
    getCategoryTotal(alerts.setup) +
    getCategoryTotal(alerts.process);

  /* =======================================================
     ACTIONS
     ======================================================= */

  const openAlert = (alert) => {
    setSelectedAlert(alert);
    setActionMessage("");
  };

  const closeAlert = () => {
    setSelectedAlert(null);
  };

  const approveAlert = (alertId) => {
    setAlerts((current) => ({
      ...current,
      pending: current.pending.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              status: "Approved",
              count: 0,
              displayCount: "00",
            }
          : alert
      ),
    }));

    setActionMessage("Request group marked as approved.");
    setSelectedAlert(null);
  };

  const rejectAlert = (alertId) => {
    setAlerts((current) => ({
      ...current,
      pending: current.pending.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              status: "Rejected",
              count: 0,
              displayCount: "00",
            }
          : alert
      ),
    }));

    setActionMessage("Request group marked as rejected.");
    setSelectedAlert(null);
  };

  const markAccountActivated = (alertId) => {
    setAlerts((current) => ({
      ...current,
      pending: current.pending.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              status: "Activated",
              count: 0,
              displayCount: "00",
            }
          : alert
      ),
    }));

    setActionMessage("Accounts marked as activated.");
    setSelectedAlert(null);
  };

  const resolveSetupIssue = (alertId) => {
    setAlerts((current) => ({
      ...current,
      setup: current.setup.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              status: "Resolved",
              count: 0,
              displayCount: "00",
            }
          : alert
      ),
    }));

    setActionMessage("Setup issue marked as resolved.");
    setSelectedAlert(null);
  };

  const resolveProcessAlert = (alertId) => {
    setAlerts((current) => ({
      ...current,
      process: current.process.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              status: "Resolved",
              count: 0,
              displayCount: "00",
            }
          : alert
      ),
    }));

    setActionMessage("Process alert marked as resolved.");
    setSelectedAlert(null);
  };

  const openProcessAlerts = () => {
    setActiveTab("process");
    setSearch("");
    setStatusFilter("all");

    window.setTimeout(() => {
      const section =
        document.querySelector(".alerts-page__content");

      section?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  };

  /* =======================================================
     RENDER TAB
     ======================================================= */

  const renderTabButton = (
    key,
    label,
    count,
    Icon
  ) => (
    <button
      type="button"
      className={`alerts-page__tab ${
        activeTab === key
          ? "alerts-page__tab--active"
          : ""
      }`}
      onClick={() => {
        setActiveTab(key);
        setSearch("");
        setStatusFilter("all");
      }}
      aria-selected={activeTab === key}
      role="tab"
    >
      <span className="alerts-page__tab-icon">
        <Icon />
      </span>

      <span className="alerts-page__tab-label">
        {label}
      </span>

      <span className="alerts-page__tab-count">
        {count}
      </span>
    </button>
  );

  /* =======================================================
     ERROR
     ======================================================= */

  if (error) {
    return (
      <main className="alerts-page">
        <div className="alerts-page__error">
          <div className="alerts-page__error-icon">
            <PiCloudWarningDuotone />
          </div>

          <h2>Unable to load alerts</h2>

          <p>
            We couldn't retrieve the latest alert
            information. Please try again.
          </p>

          <button
            type="button"
            className="alerts-page__primary-button"
            onClick={refreshAlerts}
          >
            <PiArrowsClockwiseDuotone />
            Try Again
          </button>
        </div>
      </main>
    );
  }

  /* =======================================================
     MAIN
     ======================================================= */

  return (
    <main className="alerts-page">
      {/* =====================================================
          PAGE CONTROLS
          The shared AdminLayout purple banner is the page header.
          This page ships with no dashboard chrome, so it carries
          its own way back to the dashboard.
          ===================================================== */}

      {/* ── TOP ACTION ROW: Compact right-aligned Total Alerts & Refresh ── */}
      <section className="alerts-page__topbar" aria-label="Alert controls">
        <div className="alerts-page__topbar-actions">
          <div className="alerts-page__summary-card">
            <div className="alerts-page__summary-icon">
              <PiBellRingingDuotone />
            </div>

            <div>
              <span>Total Alerts</span>
              <strong>{totalAlerts}</strong>
            </div>
          </div>

          <button
            type="button"
            className="alerts-page__refresh-button"
            onClick={refreshAlerts}
            disabled={loading}
            title="Refresh alerts"
          >
            <PiArrowsClockwiseDuotone
              className={loading ? "alerts-page__spin" : ""}
            />
            <span>{loading ? "Refreshing…" : "Refresh"}</span>
          </button>
        </div>
      </section>

      {/* =====================================================
          FEEDBACK
          ===================================================== */}

      {actionMessage && (
        <div className="alerts-page__toast">
          <PiCheckCircleDuotone />
          <span>{actionMessage}</span>

          <button
            type="button"
            onClick={() => setActionMessage("")}
            aria-label="Dismiss notification"
          >
            <PiXDuotone />
          </button>
        </div>
      )}

      {/* =====================================================
          TABS
          ===================================================== */}

      <section
        className="alerts-page__tabs"
        role="tablist"
        aria-label="Alert categories"
      >
        {renderTabButton(
          "pending",
          "Pending Requests",
          getCategoryTotal(alerts.pending),
          PiClipboardTextDuotone
        )}

        {renderTabButton(
          "setup",
          "Setup Issues",
          getCategoryTotal(alerts.setup),
          PiGearDuotone
        )}

        {renderTabButton(
          "process",
          "Process Alerts",
          getCategoryTotal(alerts.process),
          PiShieldWarningDuotone
        )}
      </section>

      {/* =====================================================
          TOOLBAR
          ===================================================== */}

      <section className="alerts-page__toolbar">
        <div className="alerts-page__toolbar-title">
          <span className="alerts-page__toolbar-icon">
            <PiFunnelDuotone size={17} />
          </span>

          <div className="alerts-page__toolbar-text">
            <strong>Alert Center</strong>
            <span className="alerts-page__toolbar-sep">|</span>
            <span className="alerts-page__toolbar-count">
              {currentAlerts.length}{" "}
              {currentAlerts.length === 1
                ? "alert"
                : "alerts"}{" "}
              shown
            </span>
          </div>
        </div>

        <div className="alerts-page__filters">
          <div className="alerts-page__search">
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search alerts..."
              aria-label="Search alerts"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <PiXCircleDuotone size={15} />
              </button>
            )}
          </div>

          <select
            className="alerts-page__status-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            aria-label="Filter by status"
          >
            <option value="all">
              All statuses
            </option>
            <option value="pending">
              Pending
            </option>
            <option value="attention">
              Attention
            </option>
            <option value="approved">
              Approved
            </option>
            <option value="rejected">
              Rejected
            </option>
            <option value="activated">
              Activated
            </option>
            <option value="active">
              Active
            </option>
            <option value="configuration required">
              Configuration Required
            </option>
            <option value="resolved">
              Resolved
            </option>
          </select>
        </div>
      </section>

      {/* =====================================================
          CONTENT
          ===================================================== */}

      <section className="alerts-page__content">
        <div className="alerts-page__section-heading">
          <span className="alerts-page__section-eyebrow">
            {activeTab === "pending"
              ? "ATTENTION REQUIRED"
              : activeTab === "setup"
              ? "CONFIGURATION"
              : "SYSTEM MONITORING"}
          </span>

          <div className="alerts-page__section-title-row">
            <h2>
              {activeTab === "pending"
                ? "Pending Requests"
                : activeTab === "setup"
                ? "Setup Issues"
                : "Process Alerts"}
            </h2>
            <span className="alerts-page__section-count">
              {getCategoryTotal(alerts[activeTab])}
            </span>
          </div>

          <p>
            {activeTab === "pending"
              ? "Requests waiting for administrative review."
              : activeTab === "setup"
              ? "Configuration items requiring administrator attention."
              : "Operational alerts and workflow notifications."}
          </p>
        </div>

        {loading ? (
          <div className="alerts-page__grid">
            {[1, 2, 3].map((item) => (
              <div
                className="alerts-page__skeleton-card"
                key={item}
              >
                <div className="alerts-page__skeleton alerts-page__skeleton--icon" />
                <div className="alerts-page__skeleton alerts-page__skeleton--title" />
                <div className="alerts-page__skeleton alerts-page__skeleton--text" />
                <div className="alerts-page__skeleton alerts-page__skeleton--number" />
              </div>
            ))}
          </div>
        ) : currentAlerts.length === 0 ? (
          <div className="alerts-page__empty">
            <div className="alerts-page__empty-icon">
              <PiCheckCircleDuotone />
            </div>

            <h3>All clear</h3>

            <p>
              There are no alerts matching your current
              filters.
            </p>

            {(search || statusFilter !== "all") && (
              <button
                type="button"
                className="alerts-page__secondary-button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="alerts-page__grid">
            {currentAlerts.map((alert) => {
              const Icon = alert.icon;

              return (
                <article
                  className={`alerts-page__card alerts-page__card--${alert.color}`}
                  key={alert.id}
                >
                  <div className="alerts-page__card-top">
                    <div className="alerts-page__card-icon">
                      <Icon />
                    </div>

                    <span
                      className={`alerts-page__severity alerts-page__severity--${alert.severity
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      {alert.severity}
                    </span>
                  </div>

                  <div className="alerts-page__card-heading">
                    <h3>{alert.title}</h3>
                    <p>{alert.description}</p>
                  </div>

                  <div className="alerts-page__card-meta">
                    <div>
                      <PiClockDuotone />
                      <span>
                        {alert.updated}
                      </span>
                    </div>

                    <div>
                      <PiUsersThreeDuotone />
                      <span>
                        {alert.department}
                      </span>
                    </div>
                  </div>

                  <div className="alerts-page__card-bottom">
                    <div className="alerts-page__card-count">
                      <span>Open Items</span>
                      <strong>
                        {formatCount(
                          alert.displayCount ??
                            alert.count
                        )}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="alerts-page__view-button"
                      onClick={() =>
                        openAlert(alert)
                      }
                    >
                      View
                      <PiArrowRightDuotone />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ===================================================
            PROCESS ACTION PANEL
            =================================================== */}

        {activeTab === "process" &&
          currentAlerts.length > 0 && (
            <div className="alerts-page__process-panel">
              <div className="alerts-page__process-icon">
                <PiInfoDuotone />
              </div>

              <div className="alerts-page__process-copy">
                <strong>
                  Process alerts require review
                </strong>

                <span>
                  Review active workflow alerts and resolve
                  issues before they affect daily HR
                  operations.
                </span>
              </div>

              <button
                type="button"
                className="alerts-page__primary-button"
                onClick={() =>
                  openAlert(currentAlerts[0])
                }
              >
                Open Alerts
                <PiArrowRightDuotone />
              </button>
            </div>
          )}

        {/* ===================================================
            SYSTEM FOOTER CARD
            =================================================== */}

        <div className="alerts-page__system-card">
          <div className="alerts-page__system-icon">
            <PiClipboardTextDuotone />
          </div>

          <div>
            <strong>Alert center</strong>
            <span>
              Pending requests, setup issues and process
              alerts are maintained here.
            </span>
          </div>

          <button
            type="button"
            className="alerts-page__system-status"
            onClick={openProcessAlerts}
          >
            <span />
            System monitoring active
          </button>
        </div>
      </section>

      {/* =====================================================
          DETAIL MODAL
          ===================================================== */}

      {selectedAlert && (
        <div
          className="alerts-page__modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeAlert();
            }
          }}
        >
          <div
            className="alerts-page__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="alert-detail-title"
          >
            <div className="alerts-page__modal-header">
              <div className="alerts-page__modal-heading">
                <div className="alerts-page__modal-icon">
                  {React.createElement(
                    selectedAlert.icon
                  )}
                </div>

                <div>
                  <span>
                    {selectedAlert.source}
                  </span>

                  <h2 id="alert-detail-title">
                    {selectedAlert.title}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                className="alerts-page__modal-close"
                onClick={closeAlert}
                aria-label="Close alert details"
              >
                <PiXDuotone />
              </button>
            </div>

            <div className="alerts-page__modal-body">
              <div className="alerts-page__detail-summary">
                <div>
                  <span>Status</span>

                  <strong>
                    <span
                      className={`alerts-page__status-dot alerts-page__status-dot--${selectedAlert.status
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    />
                    {selectedAlert.status}
                  </strong>
                </div>

                <div>
                  <span>Severity</span>

                  <strong>
                    {selectedAlert.severity}
                  </strong>
                </div>

                <div>
                  <span>Open Items</span>

                  <strong>
                    {formatCount(
                      selectedAlert.displayCount ??
                        selectedAlert.count
                    )}
                  </strong>
                </div>

                <div>
                  <span>Last Updated</span>

                  <strong>
                    {selectedAlert.updated}
                  </strong>
                </div>
              </div>

              <div className="alerts-page__detail-description">
                <span>Description</span>

                <p>
                  {selectedAlert.description}
                </p>
              </div>

              <div className="alerts-page__records-heading">
                <div>
                  <h3>Related Records</h3>
                  <span>
                    Showing representative records
                  </span>
                </div>

                <span className="alerts-page__records-count">
                  {selectedAlert.records.length}
                </span>
              </div>

              <div className="alerts-page__records">
                {selectedAlert.records.map(
                  (record, index) => (
                    <div
                      className="alerts-page__record"
                      key={`${selectedAlert.id}-${index}`}
                    >
                      <div className="alerts-page__record-avatar">
                        <PiPersonDuotone />
                      </div>

                      <div className="alerts-page__record-main">
                        <strong>
                          {record.employee}
                        </strong>

                        <span>
                          {record.employeeId} ·{" "}
                          {record.department}
                        </span>

                        <div className="alerts-page__record-details">
                          <span>
                            <b>Type:</b>{" "}
                            {record.requestType}
                          </span>

                          <span>
                            <b>Submitted:</b>{" "}
                            {record.submitted}
                          </span>

                          {record.from !== "—" && (
                            <span>
                              <b>Period:</b>{" "}
                              {record.from} →{" "}
                              {record.to}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="alerts-page__record-status">
                        {record.status}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="alerts-page__modal-footer">
              <button
                type="button"
                className="alerts-page__secondary-button"
                onClick={closeAlert}
              >
                <PiArrowLeftDuotone />
                Back
              </button>

              <div className="alerts-page__modal-actions">
                {activeTab === "pending" &&
                  selectedAlert.actionType !== "activation" && (
                    <>
                      <button
                        type="button"
                        className="alerts-page__danger-button"
                        onClick={() =>
                          rejectAlert(
                            selectedAlert.id
                          )
                        }
                      >
                        <PiXCircleDuotone />
                        Reject
                      </button>

                      <button
                        type="button"
                        className="alerts-page__success-button"
                        onClick={() =>
                          approveAlert(
                            selectedAlert.id
                          )
                        }
                      >
                        <PiCheckDuotone />
                        Approve
                      </button>
                    </>
                  )}

                {activeTab === "pending" &&
                  selectedAlert.actionType === "activation" && (
                    <button
                      type="button"
                      className="alerts-page__primary-button"
                      onClick={() =>
                        markAccountActivated(
                          selectedAlert.id
                        )
                      }
                    >
                      <PiCheckCircleDuotone />
                      Mark Activated
                    </button>
                  )}

                {activeTab === "setup" && (
                  <button
                    type="button"
                    className="alerts-page__primary-button"
                    onClick={() =>
                      resolveSetupIssue(
                        selectedAlert.id
                      )
                    }
                  >
                    <PiCheckCircleDuotone />
                    Mark Resolved
                  </button>
                )}

                {activeTab === "process" && (
                  <button
                    type="button"
                    className="alerts-page__primary-button"
                    onClick={() =>
                      resolveProcessAlert(
                        selectedAlert.id
                      )
                    }
                  >
                    <PiCheckCircleDuotone />
                    Resolve Alert
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default AlertPage;