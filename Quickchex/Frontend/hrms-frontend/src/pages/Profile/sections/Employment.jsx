import React from "react";
import { useEffect, useState } from "react";

function Employment({ isEditing, formData, setFormData }) {

  const [supervisors, setSupervisors] = useState([]);
  useEffect(() => {
    const fetchTLs = async () => {
      try {
        const res = await fetch(`https://quickchex-backend.onrender.com/profile/team-leads/`);
        const data = await res.json();
        setSupervisors(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchTLs();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    console.log(name, value);   // 🔥 add this

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const getSupervisorName = () => {
    const sup = supervisors.find(
      (s) => s.emp_code === formData.reporting_supervisor
    );
    return sup ? sup.name : "-";
  };

  return (
    <div className="section">
      <div className="section-header">

      </div>

      {/* ================= GENERAL DETAILS ================= */}
      <div className="card">
        <h4>General Employment Details</h4>

        <div className="form-grid">

          {/* Employee Code */}
          <input
            name="emp_code"
            disabled
            value={formData.emp_code || ""}
            placeholder="Employee Code *"
          />

          {/* Joining Date */}
          <input
            type="date"
            name="joining_date"
            disabled={!isEditing}
            value={formData.joining_date || ""}
            onChange={handleChange}
          />

          {/* Employment Type */}
          <select
            name="employment_type"
            disabled={!isEditing}
            value={formData.employment_type || "Full Time"}
            onChange={handleChange}
          >
            <option>Full Time</option>
            <option>Part Time</option>
            <option>Intern</option>
          </select>

          {/* Skill Level */}
          <select
            name="skill_level"
            disabled={!isEditing}
            value={formData.skill_level || ""}
            onChange={handleChange}
          >
            <option value="">Select Skill Level</option>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Expert</option>
          </select>

        </div>
      </div>

      {/* ================= EMPLOYMENT STATUS ================= */}
      <div className="card">
        <h4>Employment Status</h4>

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
                  formData.emp_effective_from || "-"
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
                  formData.emp_effective_to || "-"
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
                  formData.confirmation_due || "-"
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
                  formData.confirmation_date || "-"
                )}
              </td>

              <td>
                {isEditing ? (
                  <select
                    name="employment_status"
                    value={formData.employment_status ?? ""}
                    onChange={handleChange}
                  >
                    <option value="">Select Status</option>
                    <option value="Full Time">Full Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Probation">Probation</option>
                  </select>
                ) : (
                  formData.employment_status || "NA"
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ================= JOB INFO ================= */}
      <div className="card">
        <h4>Job Information</h4>

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
                  formData.job_effective_from || "-"
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
                  formData.job_effective_to || "-"
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
                  formData.location || "-"
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
                  formData.department || "-"
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
                  formData.designation || "-"
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

                    {supervisors.length > 0 &&
                      supervisors.map((emp) => (
                        <option key={emp.emp_code} value={emp.emp_code}>
                          {emp.name}
                        </option>
                      ))
                    }
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
  );
}

export default Employment;