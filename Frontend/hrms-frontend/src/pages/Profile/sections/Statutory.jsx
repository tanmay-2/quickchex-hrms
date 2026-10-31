// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - STATUTORY.JSX
// Path: Frontend/hrms-frontend/src/pages/Profile/sections/Statutory.jsx
// Purpose: Web portal page component managing 'Statutory' views, user interactions, and state.
// UI Components:
//   • <Statutory />
//   • <RadioField />
// Key Functions & Handlers:
//   • handleRadioChange()
//   • handleInput()
// ==============================================================================

import React from "react";

function Statutory({ isEditing, formData, setFormData }) {
  const handleRadioChange = (name, val) => {
    setFormData((prev) => ({
      ...prev,
      [name]: val,
    }));
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="section">
      <div className="card">
        <h4>Statutory Settings Information</h4>

        <div className="form-grid statutory-grid">
          {/* PF */}
          <RadioField
            name="pf_applicable"
            label="PF Applicable"
            value={formData.pf_applicable}
            isEditing={isEditing}
            onChange={(val) => handleRadioChange("pf_applicable", val)}
          />

          {/* ESIC */}
          <RadioField
            name="esic_applicable"
            label="ESIC Applicable"
            value={formData.esic_applicable}
            isEditing={isEditing}
            onChange={(val) => handleRadioChange("esic_applicable", val)}
          />

          {/* PT */}
          <RadioField
            name="pt_applicable"
            label="PT Applicable"
            value={formData.pt_applicable}
            isEditing={isEditing}
            onChange={(val) => handleRadioChange("pt_applicable", val)}
          />

          {/* LWF */}
          <RadioField
            name="lwf_applicable"
            label="LWF Applicable"
            value={formData.lwf_applicable}
            isEditing={isEditing}
            onChange={(val) => handleRadioChange("lwf_applicable", val)}
          />

          {/* IT */}
          <RadioField
            name="it_applicable"
            label="IT Applicable"
            value={formData.it_applicable}
            isEditing={isEditing}
            onChange={(val) => handleRadioChange("it_applicable", val)}
          />

          {/* GRATUITY */}
          <RadioField
            name="gratuity_applicable"
            label="Gratuity Applicable"
            value={formData.gratuity_applicable}
            isEditing={isEditing}
            onChange={(val) => handleRadioChange("gratuity_applicable", val)}
          />

          {/* NPS */}
          <RadioField
            name="nps_applicable"
            label="NPS Applicable"
            value={formData.nps_applicable}
            isEditing={isEditing}
            onChange={(val) => handleRadioChange("nps_applicable", val)}
          />

          {/* DECIMAL */}
          <RadioField
            name="decimal_rates_allowed"
            label="Decimal Rates Allowed"
            value={formData.decimal_rates_allowed}
            isEditing={isEditing}
            onChange={(val) => handleRadioChange("decimal_rates_allowed", val)}
          />

          {/* TAX ON NO PAN */}
          <RadioField
            name="tax_no_on_pan"
            label="Tax on No PAN & Inoperative PAN"
            value={formData.tax_no_on_pan}
            isEditing={isEditing}
            onChange={(val) => handleRadioChange("tax_no_on_pan", val)}
          />

          {/* PRAN NUMBER */}
          <div className="form-group">
            <label htmlFor="stat-pran">PRAN Number</label>
            <input
              id="stat-pran"
              name="pran_number"
              disabled={!isEditing}
              value={formData.pran_number || ""}
              onChange={handleInput}
              placeholder="Enter PRAN Number"
            />
          </div>

          {/* TAX REGIME */}
          <div className="form-group">
            <label htmlFor="stat-tax-regime">Tax Regime</label>
            <select
              id="stat-tax-regime"
              name="tax_regime"
              disabled={!isEditing}
              value={formData.tax_regime || "New"}
              onChange={handleInput}
            >
              <option value="New">New Regime</option>
              <option value="Old">Old Regime</option>
            </select>
          </div>

          {/* UPDATED AT */}
          <div className="form-group">
            <label htmlFor="stat-regime-date">Tax Regime Updated at</label>
            <input
              id="stat-regime-date"
              type="date"
              name="tax_regime_updated_at"
              disabled={!isEditing}
              value={formData.tax_regime_updated_at ? formData.tax_regime_updated_at.split("T")[0] : ""}
              onChange={handleInput}
            />
          </div>

          {/* UPDATED BY */}
          <div className="form-group">
            <label htmlFor="stat-regime-by">Tax Regime Updated by</label>
            <input
              id="stat-regime-by"
              name="tax_regime_updated_by"
              disabled={!isEditing}
              value={formData.tax_regime_updated_by || formData.tax_updated_by || ""}
              onChange={handleInput}
              placeholder="e.g. Administrator"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Clean, properly aligned Yes/No radio group
 */
function RadioField({ name, label, value, isEditing, onChange }) {
  const isYes = value === true || value === "true" || value === 1 || value === "1" || value === "Yes";
  const isNo = value === false || value === "false" || value === 0 || value === "0" || value === "No";

  return (
    <div className="form-group statutory-field-group">
      <label className="statutory-field-label">{label}</label>
      <div className="statutory-radio-pair" role="radiogroup" aria-label={label}>
        <label
          className={`statutory-radio-opt ${isYes ? "is-checked" : ""} ${!isEditing ? "is-disabled" : ""}`}
        >
          <input
            type="radio"
            name={name}
            value="true"
            checked={isYes}
            disabled={!isEditing}
            onChange={() => onChange(true)}
          />
          <span className="statutory-radio-text">Yes</span>
        </label>

        <label
          className={`statutory-radio-opt ${isNo ? "is-checked" : ""} ${!isEditing ? "is-disabled" : ""}`}
        >
          <input
            type="radio"
            name={name}
            value="false"
            checked={isNo}
            disabled={!isEditing}
            onChange={() => onChange(false)}
          />
          <span className="statutory-radio-text">No</span>
        </label>
      </div>
    </div>
  );
}

export default Statutory;