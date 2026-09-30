function Statutory({ isEditing, formData, setFormData }) {

  const handleRadioChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value === "true",
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
      <div className="section-header">
        
      </div>
      

      <div className="card">
        <h4>Statutory Settings Information</h4>

        <div className="form-grid statutory-grid">

          {/* PF */}
          <Radio name="pf_applicable" label="PF Applicable" formData={formData} isEditing={isEditing} handleRadioChange={handleRadioChange} />

          {/* ESIC */}
          <Radio name="esic_applicable" label="ESIC Applicable" formData={formData} isEditing={isEditing} handleRadioChange={handleRadioChange} />

          {/* PT */}
          <Radio name="pt_applicable" label="PT Applicable" formData={formData} isEditing={isEditing} handleRadioChange={handleRadioChange} />

          {/* LWF */}
          <Radio name="lwf_applicable" label="LWF Applicable" formData={formData} isEditing={isEditing} handleRadioChange={handleRadioChange} />

          {/* IT */}
          <Radio name="it_applicable" label="IT Applicable" formData={formData} isEditing={isEditing} handleRadioChange={handleRadioChange} />

          {/* GRATUITY */}
          <Radio name="gratuity_applicable" label="Gratuity Applicable" formData={formData} isEditing={isEditing} handleRadioChange={handleRadioChange} />

          {/* NPS */}
          <Radio name="nps_applicable" label="NPS Applicable" formData={formData} isEditing={isEditing} handleRadioChange={handleRadioChange} />

          {/* PRAN */}
          <div className="form-group">
            <label>PRAN Number</label>
            <input
              name="pran_number"
              disabled={!isEditing}
              value={formData.pran_number || ""}
              onChange={handleInput}
              placeholder="PRAN Number"
            />
          </div>

          {/* TAX REGIME */}
          <div className="form-group">
            <label>Tax Regime</label>
            <select
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
            <label>Tax Regime Updated at</label>
            <input
              type="date"
              name="tax_regime_updated_at"
              disabled={!isEditing}
              value={formData.tax_regime_updated_at || ""}
              onChange={handleInput}
            />
          </div>

          {/* UPDATED BY */}
          <div className="form-group">
            <label>Tax Regime Updated by</label>
            <input
              name="tax_updated_by"
              disabled={!isEditing}
              value={formData.tax_updated_by || ""}
              onChange={handleInput}
              placeholder="Enter name"
            />
          </div>

          {/* DECIMAL */}
          <Radio name="decimal_rates_allowed" label="Decimal Rates Allowed" formData={formData} isEditing={isEditing} handleRadioChange={handleRadioChange} />

          {/* NO PAN */}
          <div className="form-group full-width">
            <label>Tax on No PAN & Inoperative PAN</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  checked={formData.tax_no_on_pan === true}
                  disabled={!isEditing}
                  onChange={() => handleRadioChange("tax_no_on_pan", "true")}
                /> Yes
              </label>

              <label>
                <input
                  type="radio"
                  checked={formData.tax_no_on_pan === false}
                  disabled={!isEditing}
                  onChange={() => handleRadioChange("tax_no_on_pan", "false")}
                /> No
              </label>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* 🔥 REUSABLE RADIO COMPONENT */
function Radio({ name, label, formData, isEditing, handleRadioChange }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="radio-group">
        <label>
          <input
            type="radio"
            checked={formData[name] === true}
            disabled={!isEditing}
            onChange={() => handleRadioChange(name, "true")}
          /> Yes
        </label>

        <label>
          <input
            type="radio"
            checked={formData[name] === false}
            disabled={!isEditing}
            onChange={() => handleRadioChange(name, "false")}
          /> No
        </label>
      </div>
    </div>
  );
}

export default Statutory;