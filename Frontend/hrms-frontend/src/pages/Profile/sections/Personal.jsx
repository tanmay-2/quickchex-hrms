import React from "react";

/**
 * Every control has a real <label>. The old version relied on placeholders
 * alone, which vanish the moment a value is present - so a filled-in form
 * became a column of values with no way to tell what any of them were.
 */
function Personal({ isEditing, formData, setFormData }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* Shared props so every field behaves the same way. */
  const field = (name) => ({
    id: `personal-${name}`,
    name,
    disabled: !isEditing,
    value: formData[name] || "",
    onChange: handleChange,
  });

  return (
    <div className="section">
      {/* BASIC */}
      <div className="card">
        <h4>Basic Information</h4>

        <div className="form-grid">
          <Field label="First name" htmlFor="personal-first_name" required>
            <input {...field("first_name")} placeholder="e.g. Priya" autoComplete="given-name" />
          </Field>

          <Field label="Middle name" htmlFor="personal-middle_name">
            <input {...field("middle_name")} placeholder="Optional" autoComplete="additional-name" />
          </Field>

          <Field label="Last name" htmlFor="personal-last_name" required>
            <input {...field("last_name")} placeholder="e.g. Menon" autoComplete="family-name" />
          </Field>

          <Field label="Email address" htmlFor="personal-email" required>
            <input {...field("email")} type="email" placeholder="name@company.com" autoComplete="email" />
          </Field>

          <Field label="Mobile number" htmlFor="personal-mobile">
            <input {...field("mobile")} type="tel" inputMode="numeric" placeholder="10-digit number" autoComplete="tel" />
          </Field>

          <Field label="Gender" htmlFor="personal-gender">
            <select {...field("gender")}>
              <option value="">Select gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </Field>

          <Field label="Date of birth" htmlFor="personal-dob">
            <input {...field("dob")} type="date" />
          </Field>

          <Field label="Marital status" htmlFor="personal-marital_status">
            <select {...field("marital_status")}>
              <option value="">Select status</option>
              <option>Single</option>
              <option>Married</option>
              <option>Divorced</option>
              <option>Widowed</option>
            </select>
          </Field>

          <Field label="PAN" htmlFor="personal-pan" hint="10 characters, e.g. ABCDE1234F">
            <input
              {...field("pan")}
              placeholder="ABCDE1234F"
              maxLength={10}
              style={{ textTransform: "uppercase" }}
            />
          </Field>

          <Field label="Aadhaar number" htmlFor="personal-aadhar">
            <input {...field("aadhar")} inputMode="numeric" placeholder="12-digit number" maxLength={12} />
          </Field>
        </div>
      </div>

      {/* FAMILY */}
      <div className="card">
        <h4>Family Information</h4>

        <div className="form-grid">
          <Field label="Father's name" htmlFor="personal-father_name">
            <input {...field("father_name")} placeholder="Full name" />
          </Field>

          <Field label="Mother's name" htmlFor="personal-mother_name">
            <input {...field("mother_name")} placeholder="Full name" />
          </Field>

          <Field label="Emergency contact" htmlFor="personal-family_contact" hint="Reached if you can't be">
            <input {...field("family_contact")} type="tel" inputMode="numeric" placeholder="10-digit number" />
          </Field>
        </div>
      </div>

      {/* ADDRESS */}
      <div className="card">
        <h4>Address Information</h4>

        <div className="form-grid">
          <Field label="Address line 1" htmlFor="personal-address1">
            <input {...field("address1")} placeholder="House / flat, street" autoComplete="address-line1" />
          </Field>

          <Field label="Address line 2" htmlFor="personal-address2">
            <input {...field("address2")} placeholder="Area, landmark" autoComplete="address-line2" />
          </Field>

          <Field label="Country" htmlFor="personal-country">
            <input {...field("country")} placeholder="e.g. India" autoComplete="country-name" />
          </Field>

          <Field label="State / province" htmlFor="personal-state">
            <input {...field("state")} placeholder="e.g. Maharashtra" autoComplete="address-level1" />
          </Field>

          <Field label="City" htmlFor="personal-city">
            <input {...field("city")} placeholder="e.g. Mumbai" autoComplete="address-level2" />
          </Field>

          <Field label="PIN code" htmlFor="personal-pincode">
            <input {...field("pincode")} inputMode="numeric" placeholder="6 digits" maxLength={6} autoComplete="postal-code" />
          </Field>
        </div>
      </div>
    </div>
  );
}

/* Label above the control, optional hint below it. */
function Field({ label, htmlFor, required, hint, children }) {
  return (
    <div className="pf-field">
      <label htmlFor={htmlFor}>
        {label}
        {required && <span className="pf-req" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && <span className="pf-hint">{hint}</span>}
    </div>
  );
}

export default Personal;