import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Bell,
  ChevronDown,
  Search,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  UserCheck,
  XCircle,
  Download,
  Gift,
  Phone,
  Mail,
  X,
  Share2,
} from "lucide-react";
import { DashboardHeader } from "../../components/header/DashboardHeader";
import "./ReferralRecords.css";



function ReferralRecords() {
  const navigate = useNavigate();

  const [referrals, setReferrals] = useState(() => {
    try {
      const saved = localStorage.getItem("referral_records_v1");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewModalItem, setViewModalItem] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const filteredReferrals = useMemo(() => {
    const query = search.trim().toLowerCase();
    return referrals.filter((item) => {
      const matchesStatus =
        statusFilter === "All" || item.status.toLowerCase() === statusFilter.toLowerCase();
      if (!matchesStatus) return false;

      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        item.company.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        item.phone.includes(query)
      );
    });
  }, [referrals, search, statusFilter]);

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["ID,Name,Email,Company,Phone,Source,Status,Date,Reward Status"]
        .concat(
          referrals.map(
            (r) =>
              `${r.id},"${r.name}",${r.email},"${r.company}",${r.phone},"${r.source}",${r.status},${r.date},"${r.rewardStatus}"`
          )
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "employee_referral_records.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported referral records to CSV");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Hired":
        return (
          <span className="rr-status-badge hired">
            <CheckCircle2 size={12} />
            Hired
          </span>
        );
      case "Contacted":
        return (
          <span className="rr-status-badge contacted">
            <Clock size={12} />
            Contacted
          </span>
        );
      case "Rejected":
        return (
          <span className="rr-status-badge rejected">
            <XCircle size={12} />
            Rejected
          </span>
        );
      default:
        return (
          <span className="rr-status-badge pending">
            <Clock size={12} />
            Pending
          </span>
        );
    }
  };

  const profileName =
    window.localStorage.getItem("user_name") ||
    window.localStorage.getItem("name") ||
    "RV";

  return (
    <div className="referral-records-page">
      <DashboardHeader />

      {/* =====================================================
          PAGE BODY
          ===================================================== */}
      <div className="rr-body">
        <div className="rr-top-bar">
          <h2 className="rr-section-title">Submitted Referrals</h2>

          <div className="rr-controls">
            {/* Search Box */}
            <div className="rr-search-wrap">
              <input
                type="text"
                placeholder="Search referral or company"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rr-search-input"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rr-status-filter"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Contacted">Contacted</option>
              <option value="Hired">Hired</option>
              <option value="Rejected">Rejected</option>
            </select>

            {/* Export */}
            <button
              type="button"
              className="rr-add-btn"
              style={{ background: "var(--rr-surface)", color: "var(--rr-ink)", border: "1px solid var(--rr-border)" }}
              onClick={handleExportCSV}
            >
              <Download size={15} />
              Export
            </button>

            {/* New Referral Button */}
            <button
              type="button"
              className="rr-add-btn"
              onClick={() => navigate("/dashboard/referral")}
            >
              <Plus size={16} />
              New Referral
            </button>
          </div>
        </div>

        {/* =====================================================
            TABLE
            ===================================================== */}
        <div className="rr-table-card">
          <table className="rr-table">
            <thead>
              <tr>
                <th>Referred Person</th>
                <th>Company</th>
                <th>Phone No.</th>
                <th>Source</th>
                <th>Status</th>
                <th>Date Referred</th>
                <th>Reward Status</th>
                <th style={{ textAlign: "right", paddingRight: "24px" }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredReferrals.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="rr-empty-state">
                      <Share2 size={36} />
                      <h3>No Referral Records Found</h3>
                      <p>Try clearing filters or submit a new referral using the button above.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReferrals.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="rr-person-cell">
                        <div className={`rr-avatar ${item.avatarTone}`}>{item.initials}</div>
                        <div>
                          <div className="rr-person-name">{item.name}</div>
                          <div className="rr-person-email">{item.email}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ fontWeight: 500 }}>{item.company}</td>
                    <td>{item.phone}</td>
                    <td>{item.source}</td>
                    <td>{getStatusBadge(item.status)}</td>
                    <td style={{ color: "var(--rr-ink-muted)", fontSize: "13px" }}>{item.date}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12.5px", fontWeight: 600, color: item.status === "Hired" ? "var(--rr-purple)" : "var(--rr-ink-muted)" }}>
                        {item.status === "Hired" && <Gift size={13} />}
                        {item.rewardStatus}
                      </span>
                    </td>
                    <td>
                      <div className="rr-action-btns" style={{ justifyContent: "flex-end", paddingRight: "6px" }}>
                        <button
                          type="button"
                          className="rr-row-btn"
                          title="View Referral Details"
                          onClick={() => setViewModalItem(item)}
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================
          VIEW DETAILS MODAL
          ===================================================== */}
      {viewModalItem && (
        <div className="rr-modal-overlay" onClick={() => setViewModalItem(null)}>
          <div className="rr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rr-modal-head">
              <h3>Referral Details — {viewModalItem.name}</h3>
              <button
                type="button"
                className="rr-modal-close"
                onClick={() => setViewModalItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="rr-modal-body">
              <div className="rr-detail-row">
                <strong>Referred Person:</strong>
                <span>{viewModalItem.name}</span>
              </div>
              <div className="rr-detail-row">
                <strong>Company:</strong>
                <span>{viewModalItem.company}</span>
              </div>
              <div className="rr-detail-row">
                <strong>Email Address:</strong>
                <span>{viewModalItem.email}</span>
              </div>
              <div className="rr-detail-row">
                <strong>Phone Number:</strong>
                <span>{viewModalItem.phone}</span>
              </div>
              <div className="rr-detail-row">
                <strong>Referral Source:</strong>
                <span>{viewModalItem.source}</span>
              </div>
              <div className="rr-detail-row">
                <strong>Current Status:</strong>
                <span>{viewModalItem.status}</span>
              </div>
              <div className="rr-detail-row">
                <strong>Date Referred:</strong>
                <span>{viewModalItem.date}</span>
              </div>
              <div className="rr-detail-row">
                <strong>Reward Status:</strong>
                <span style={{ color: "var(--rr-purple)", fontWeight: 600 }}>
                  {viewModalItem.rewardStatus}
                </span>
              </div>
              {viewModalItem.comments && (
                <div className="rr-detail-row">
                  <strong>Notes / Comments:</strong>
                  <span>{viewModalItem.comments}</span>
                </div>
              )}
            </div>

            <div className="rr-modal-foot">
              <button
                type="button"
                className="rr-btn-action"
                onClick={() => setViewModalItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST MESSAGE */}
      {toastMessage && <div className="rr-toast">{toastMessage}</div>}
    </div>
  );
}

export default ReferralRecords;
