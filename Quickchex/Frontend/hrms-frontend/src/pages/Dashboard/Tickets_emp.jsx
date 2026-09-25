import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// 🔥 Imported both sidebars
import SidebarEmp from "../../components/sidebar/Sidebar_emp";
import SidebarTL from "../../components/sidebar/sidebar_tl";
import CustomSelect from "../../components/ui/CustomSelect";
import "../Admin/AllTickets.css";

const getApiHost = () => typeof window !== "undefined" && window.location?.hostname ? window.location.hostname : "localhost";
const API_BASE_URL = `http://${getApiHost()}:8000/api/v1`;

const Tickets_emp = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [tickets, setTickets] = useState([]);
    const [expanded, setExpanded] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // 🔥 Get the user's role from local storage
    const userRole = localStorage.getItem("role");

    const [ticketForm, setTicketForm] = useState({
        title: "",
        description: "",
        impact: "",
        urgency: ""
    });

    const [errorMsg, setErrorMsg] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);

    // 🔥 Reset modal states on component mount to prevent persisting across routes
    useEffect(() => {
        setShowModal(false);
        setSelectedTicket(null);
        setTicketForm({ title: "", description: "", impact: "", urgency: "" });
        setErrorMsg("");
        fetchMyTickets();
    }, [location.pathname]);

    // 🔥 Cleanup on component unmount
    useEffect(() => {
        return () => {
            setShowModal(false);
            setSelectedTicket(null);
            setTicketForm({ title: "", description: "", impact: "", urgency: "" });
            setErrorMsg("");
        };
    }, []);

    const fetchMyTickets = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/tickets/my`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                const data = await res.json();
                setTickets(data);
            } else if (res.status === 401) {
                navigate("/login");
            }
        } catch (error) {
            console.error("Failed to fetch tickets:", error);
        }
    };

    const handleCreateTicket = async () => {
        if (!ticketForm.title.trim() || !ticketForm.impact || !ticketForm.urgency) {
            setErrorMsg("Title, Impact, and Urgency are required.");
            return;
        }

        setErrorMsg("");
        setIsLoading(true);

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/tickets`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(ticketForm)
            });

            if (res.ok) {
                setShowModal(false);
                setTicketForm({ title: "", description: "", impact: "", urgency: "" });
                fetchMyTickets();
            } else {
                const errorData = await res.json();
                setErrorMsg(errorData.detail || "Failed to create ticket.");
                if (res.status === 401) navigate("/login");
            }
        } catch (error) {
            setErrorMsg("Server connection failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="layout">
            {/* 🔥 CONDITIONAL SIDEBAR RENDERING */}
            {userRole === "teamleader" ? (
                <SidebarTL expanded={expanded} setExpanded={setExpanded} />
            ) : (
                <SidebarEmp expanded={expanded} setExpanded={setExpanded} />
            )}

            <div className={`main-content ${expanded ? "shifted" : ""}`}>
                <div className="tickets-top">
                    <h2>My Tickets</h2>
                    <button className="action-btn btn-progress" onClick={() => setShowModal(true)}>
                        + Create Ticket
                    </button>
                </div>

                <div className="tickets-table-wrapper">
                    <table className="tickets-table my-tickets-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Date Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.length === 0 ? (
                                <tr><td colSpan="4" className="no-data">No tickets found</td></tr>
                            ) : (
                                tickets.map((t) => {
                                    const priorityClass = t.priority ? t.priority.toLowerCase() : "unassigned";

                                    return (
                                        <tr
                                            key={t.id}
                                            onClick={() => setSelectedTicket(t)}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <td>{t.title}</td>
                                            <td>
                                                <span className={`status ${t.status?.toLowerCase().replace(" ", "_")}`}>
                                                    {t.status}
                                                </span>
                                            </td>

                                            <td>
                                                <span className={`priority-badge ${priorityClass}`}>
                                                    {t.priority || "Unassigned"}
                                                </span>
                                            </td>

                                            <td>
                                                {t.created_at ? new Date(t.created_at).toLocaleDateString("en-GB", {
                                                    day: "2-digit", month: "short", year: "numeric",
                                                }) : "..."}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* --- CREATE TICKET MODAL --- */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>New Ticket</h2>
                                <div className="modal-close" onClick={() => setShowModal(false)}>✕</div>
                            </div>
                            <div className="modal-body">
                                <label>Title *</label>
                                <input
                                    className="modal-input"
                                    value={ticketForm.title}
                                    onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                                    placeholder="Brief summary of the issue"
                                />

                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label>Impact *</label>
                                        <CustomSelect
                                            placeholder="Select Impact"
                                            value={ticketForm.impact}
                                            onChange={(val) => setTicketForm({ ...ticketForm, impact: val })}
                                            options={[
                                                { value: "High", label: "High (Entire Company/System)" },
                                                { value: "Medium", label: "Medium (Specific Department/Group)" },
                                                { value: "Low", label: "Low (Just Me/Single User)" },
                                            ]}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label>Urgency *</label>
                                        <CustomSelect
                                            placeholder="Select Urgency"
                                            value={ticketForm.urgency}
                                            onChange={(val) => setTicketForm({ ...ticketForm, urgency: val })}
                                            options={[
                                                { value: "High", label: "High (Work is completely stopped)" },
                                                { value: "Medium", label: "Medium (Work is degraded/slow)" },
                                                { value: "Low", label: "Low (Just an annoyance/cosmetic)" },
                                            ]}
                                        />
                                    </div>
                                </div>

                                <label>Description</label>
                                <textarea
                                    className="modal-input"
                                    value={ticketForm.description}
                                    onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                                    style={{ height: '100px' }}
                                    placeholder="Provide detailed information..."
                                />
                                {errorMsg && <p style={{ color: 'red', fontSize: '12px' }}>{errorMsg}</p>}
                            </div>
                            <div className="modal-footer">
                                <button className="action-btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button
                                    className="action-btn btn-progress"
                                    onClick={handleCreateTicket}
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Submitting..." : "Submit"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- VIEW TICKET MODAL --- */}
                {selectedTicket && (
                    <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
                        <div className="modal-container" onClick={(e) => e.stopPropagation()}>

                            <div className="modal-header">
                                <div className="modal-title">
                                    <h2 style={{ fontSize: "18px", margin: 0 }}>Ticket Details</h2>
                                </div>
                                <div className="modal-close" onClick={() => setSelectedTicket(null)}>✕</div>
                            </div>

                            <div className="modal-body">
                                <div style={{ marginBottom: "15px" }}>
                                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Title</span>
                                    <p style={{ margin: "4px 0 0 0", fontSize: "16px", fontWeight: "500", color: "#0f172a" }}>
                                        {selectedTicket.title}
                                    </p>
                                </div>

                                <div style={{ display: "flex", gap: "20px", marginBottom: "15px", flexWrap: "wrap" }}>
                                    <div>
                                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Status</span>
                                        <span className={`status ${selectedTicket.status?.toLowerCase().replace(" ", "_")}`}>
                                            {selectedTicket.status}
                                        </span>
                                    </div>

                                    <div>
                                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Priority</span>
                                        <span className={`priority-badge ${selectedTicket.priority?.toLowerCase() || 'unassigned'}`}>
                                            {selectedTicket.priority || "Unassigned"}
                                        </span>
                                    </div>

                                    <div>
                                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Date Created</span>
                                        <p style={{ margin: "0", fontSize: "14px", color: "#0f172a", paddingTop: "4px" }}>
                                            {selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleDateString("en-GB", {
                                                day: "2-digit", month: "short", year: "numeric"
                                            }) : "Unknown"}
                                        </p>
                                    </div>
                                </div>

                                <div style={{ marginBottom: "10px" }}>
                                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Description</span>
                                    <div style={{
                                        margin: "6px 0 0 0",
                                        padding: "12px",
                                        background: "#f8fafc",
                                        borderRadius: "6px",
                                        border: "1px solid #e2e8f0",
                                        fontSize: "14px",
                                        color: "#334155",
                                        minHeight: "80px",
                                        whiteSpace: "pre-wrap"
                                    }}>
                                        {selectedTicket.description || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>No description provided.</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button className="action-btn" onClick={() => setSelectedTicket(null)}>Close</button>
                            </div>

                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Tickets_emp;