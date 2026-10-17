import React, { useEffect, useState } from "react";
import { getApiUrl } from "../../../services/apiClient";

/**
 * Normalizes supervisor responses across various API response shapes
 * (direct array, { data: [] }, { supervisors: [] }, { team_leads: [] }).
 * Always returns a validated array without throwing.
 */
export function normalizeSupervisors(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response.filter(Boolean);
  if (Array.isArray(response.data)) return response.data.filter(Boolean);
  if (Array.isArray(response.supervisors)) return response.supervisors.filter(Boolean);
  if (Array.isArray(response.team_leads)) return response.team_leads.filter(Boolean);
  if (Array.isArray(response.items)) return response.items.filter(Boolean);
  return [];
}

function Employment({ isEditing, formData, setFormData }) {
  const [supervisors, setSupervisors] = useState([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchTLs = async () => {
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("authToken");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        let res = await fetch(getApiUrl("/profile/team-leads/"), { headers });
        if (!res.ok) {
          res = await fetch(getApiUrl("/api/v1/profile/team-leads/"), { headers });
        }

        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            setSupervisors(normalizeSupervisors(data));
            setLoadError(false);
          }
        } else {
          if (mounted) setSupervisors([]);
        }
      } catch (err) {
        console.error("Failed to load supervisors:", err);
        if (mounted) {
          setSupervisors([]);
          setLoadError(true);
        }
      }
    };

    fetchTLs();
    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getSupervisorName = () => {
    const list = normalizeSupervisors(supervisors);
    if (!list.length) {
      return formData.reporting_supervisor || "—";
    }
    const sup = list.find(
      (s) => s && (s.emp_code === formData.reporting_supervisor || s.name === formData.reporting_supervisor)
    );
    return sup ? (sup.name || sup.emp_code) : (formData.reporting_supervisor || "—");
  };

  return (
    <div className="section">
      {/* ================= GENERAL DETAILS ================= */}
      <div className="card">
        <h4>General Employment Details</h4>

        <div className="form-grid">
          {/* Employee Code */}
          <div className="form-group">
            <label>Employee Code</label>
            <input
              name="emp_code"
              disabled
              value={formData.emp_code || ""}
              placeholder="e.g. ADM001"
            />
          </div>

          {/* Joining Date */}
          <div className="form-group">
            <label>Joining Date</label>
            <input
              type="date"
              name="joining_date"
              disabled={!isEditing}
              value={formData.joining_date || ""}
              onChange={handleChange}
            />
          </div>

          {/* Employment Type */}
          <div className="form-group">
            <label>Employment Type</label>
            <select
              name="employment_type"
              disabled={!isEditing}
              value={formData.employment_type || "Full Time"}
              onChange={handleChange}
            >
              <option value="Full Time">Full Time</option>
              <option value="Part Time">Part Time</option>
              <option value="Contract">Contract</option>
              <option value="Intern">Intern</option>
            </select>
          </div>

          {/* Skill Level */}
          <div className="form-group">
            <label>Skill Level</label>
            <select
              name="skill_level"
              disabled={!isEditing}
              value={formData.skill_level || ""}
              onChange={handleChange}
            >
              <option value="">Select Skill Level</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
        </div>
      </div>

      {/* ================= EMPLOYMENT STATUS ================= */}
      <div className="card">
        <h4>Employment Status</h4>

        <div className="table-responsive">
          <table className="payment-table">
            <thead>
              <tr>
                <th>Effective From</th>
                <th>Effective To</th>
                <th>Confirmation Due Date</th>
                <th>Confirmation Date</th>
                <th>Employment Status</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>
                  {isEditing ? (
                    <input
                      type="date"
                      name="emp_effective_from"
                      value={formData.emp_effective_from || ""}
                      onChange={handleChange}
                    />
                  ) : (
                    formData.emp_effective_from || "—"
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <input
                      type="date"
                      name="emp_effective_to"
                      value={formData.emp_effective_to || ""}
                      onChange={handleChange}
                    />
                  ) : (
                    formData.emp_effective_to || "—"
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <input
                      type="date"
                      name="confirmation_due"
                      value={formData.confirmation_due || ""}
                      onChange={handleChange}
                    />
                  ) : (
                    formData.confirmation_due || "—"
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <input
                      type="date"
                      name="confirmation_date"
                      value={formData.confirmation_date || ""}
                      onChange={handleChange}
                    />
                  ) : (
                    formData.confirmation_date || "—"
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <select
                      name="employment_status"
                      value={formData.employment_status || "Active"}
                      onChange={handleChange}
                    >
                      <option value="Active">Active</option>
                      <option value="Full Time">Full Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Probation">Probation</option>
                      <option value="Notice Period">Notice Period</option>
                    </select>
                  ) : (
                    formData.employment_status || "Active"
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= JOB INFO ================= */}
      <div className="card">
        <h4>Job Information</h4>

        <div className="table-responsive">
          <table className="payment-table">
            <thead>
              <tr>
                <th>Effective From</th>
                <th>Effective To</th>
                <th>Branch Location</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Reporting Supervisor</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>
                  {isEditing ? (
                    <input
                      type="date"
                      name="job_effective_from"
                      value={formData.job_effective_from || ""}
                      onChange={handleChange}
                    />
                  ) : (
                    formData.job_effective_from || "—"
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <input
                      type="date"
                      name="job_effective_to"
                      value={formData.job_effective_to || ""}
                      onChange={handleChange}
                    />
                  ) : (
                    formData.job_effective_to || "—"
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <input
                      name="location"
                      value={formData.location || ""}
                      onChange={handleChange}
                    />
                  ) : (
                    formData.location || "Mumbai, IN"
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <input
                      name="department"
                      value={formData.department || ""}
                      onChange={handleChange}
                    />
                  ) : (
                    formData.department || "—"
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <input
                      name="designation"
                      value={formData.designation || ""}
                      onChange={handleChange}
                    />
                  ) : (
                    formData.designation || "—"
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <select
                      name="reporting_supervisor"
                      value={formData.reporting_supervisor || ""}
                      onChange={handleChange}
                    >
                      <option value="">Select Supervisor</option>
                      {normalizeSupervisors(supervisors).map((emp) => (
                        <option key={emp.emp_code || emp.id} value={emp.emp_code}>
                          {emp.name ? `${emp.name} (${emp.emp_code})` : emp.emp_code}
                        </option>
                      ))}
                    </select>
                  ) : (
                    getSupervisorName()
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Employment;