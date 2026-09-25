/**
 * Shared UI primitives for the La Esfera HRMS.
 *
 *   import { Button, Card, Stat, Field, Input, Badge, Table } from "../../components/ui";
 *
 * Every component reads its colours from tokens.css, so all of it responds
 * to the light/dark switch with no extra work in the page.
 */
import "./ui.css";
import { useTheme } from "../../theme/ThemeProvider";

/* --- Button -------------------------------------------------------------- */
export function Button({
  children,
  variant = "primary",
  size = "md",
  block = false,
  loading = false,
  disabled = false,
  type = "button",
  className = "",
  ...rest
}) {
  const classes = [
    "ui-btn",
    `ui-btn--${variant}`,
    `ui-btn--${size}`,
    block ? "ui-btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {loading && <span className="ui-btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

/* --- Card ---------------------------------------------------------------- */
export function Card({ children, padded = false, interactive = false, className = "", ...rest }) {
  const classes = [
    "ui-card",
    padded ? "ui-card--pad" : "",
    interactive ? "ui-card--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="ui-card__header">
      <div>
        <div className="ui-card__title">{title}</div>
        {subtitle && <div className="ui-card__subtitle">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = "" }) {
  return <div className={`ui-card__body ${className}`.trim()}>{children}</div>;
}

/* --- Stat ---------------------------------------------------------------- */
export function Stat({ label, value, hint }) {
  const isEmpty = value === null || value === undefined || value === "";

  return (
    <Card>
      <div className="ui-stat">
        <span className="ui-stat__label">{label}</span>
        <span className={`ui-stat__value ${isEmpty ? "ui-stat__value--empty" : ""}`.trim()}>
          {isEmpty ? "—" : value}
        </span>
        {hint && <span className="ui-stat__hint">{hint}</span>}
      </div>
    </Card>
  );
}

/* --- Form fields --------------------------------------------------------- */
export function Field({ label, htmlFor, required = false, error, hint, children }) {
  return (
    <div className="ui-field">
      {label && (
        <label className="ui-field__label" htmlFor={htmlFor}>
          {label}
          {required && <span className="ui-field__required" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error && <span className="ui-field__error" role="alert">{error}</span>}
      {!error && hint && <span className="ui-field__hint">{hint}</span>}
    </div>
  );
}

export function Input({ invalid = false, className = "", ...rest }) {
  return (
    <input
      className={`ui-input ${className}`.trim()}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

export function Textarea({ invalid = false, className = "", ...rest }) {
  return (
    <textarea
      className={`ui-textarea ${className}`.trim()}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

import CustomSelectComponent from "./CustomSelect";

export function Select({ invalid = false, className = "", children, ...rest }) {
  return (
    <CustomSelectComponent
      invalid={invalid}
      className={`ui-select ${className}`.trim()}
      {...rest}
    >
      {children}
    </CustomSelectComponent>
  );
}

/* --- Status -------------------------------------------------------------- */
/** Maps whatever the API returns onto the app's five known states. */
export function normaliseStatus(raw) {
  const value = String(raw || "").toLowerCase().trim();
  if (["present", "p", "in", "checked in", "active"].includes(value)) return "present";
  if (["late", "l", "delayed"].includes(value)) return "late";
  if (["absent", "a", "missing"].includes(value)) return "absent";
  if (["leave", "on leave", "holiday", "off"].includes(value)) return "leave";
  if (["pending", "awaiting", "requested", "submitted"].includes(value)) return "pending";
  return "neutral";
}

export function Badge({ status, children, className = "" }) {
  const tone = normaliseStatus(status ?? children);
  return (
    <span className={`ui-badge ui-badge--${tone} ${className}`.trim()}>
      <span className={`ui-dot ui-dot--${tone}`} aria-hidden="true" />
      {children}
    </span>
  );
}

export function StatusDot({ status }) {
  return <span className={`ui-dot ui-dot--${normaliseStatus(status)}`} aria-hidden="true" />;
}

/* --- Table --------------------------------------------------------------- */
export function Table({ children, className = "" }) {
  return (
    <div className="ui-table-wrap">
      <table className={`ui-table ${className}`.trim()}>{children}</table>
    </div>
  );
}

/* --- States -------------------------------------------------------------- */
export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="ui-empty">
      {icon && <div className="ui-empty__icon" aria-hidden="true">{icon}</div>}
      <div className="ui-empty__title">{title}</div>
      {children && <p className="ui-empty__body">{children}</p>}
      {action}
    </div>
  );
}

export function Spinner({ size = "md", label }) {
  if (!label) return <span className={`ui-spinner ui-spinner--${size}`} role="status" aria-label="Loading" />;

  return (
    <div className="ui-spinner-wrap" role="status">
      <span className={`ui-spinner ui-spinner--${size}`} />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({ width = "100%", height = 16, radius, style = {} }) {
  return (
    <span
      className="ui-skeleton"
      style={{ display: "block", width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

/* --- Theme toggle -------------------------------------------------------- */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="ui-theme-toggle"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}

/* --- Enterprise Custom Controls ------------------------------------------ */
export { default as CustomSelect } from "./CustomSelect";
export { default as CustomDatePicker } from "./CustomDatePicker";
export { SearchInput } from "./SearchInput";

