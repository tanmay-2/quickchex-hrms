import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";

/**
 * ManagerSelect — Premium custom dropdown for the Manager Portal.
 *
 * Props:
 *  value        – current selected value (string)
 *  onChange     – (value: string) => void
 *  options      – Array<{ label: string; value: string }> | string[]
 *  placeholder  – string (shown when no value selected)
 *  minWidth     – CSS string, default "160px"
 *  className    – extra class on the trigger
 */
export const ManagerSelect = ({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  minWidth = "160px",
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Normalise options to { label, value }
  const normalised = options.map((o) =>
    typeof o === "string" ? { label: o, value: o } : o
  );

  const selected = normalised.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Keyboard: Escape closes, Enter/Space toggles
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    },
    []
  );

  const handleSelect = (opt) => {
    onChange(opt.value);
    setOpen(false);
  };

  return (
    <div
      ref={wrapRef}
      className={`mp-custom-select-wrap ${className}`}
      style={{ minWidth, position: "relative", display: "inline-block" }}
    >
      {/* Trigger */}
      <button
        type="button"
        className={`mp-custom-select-trigger ${open ? "is-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="mp-cs-value">
          {selected ? selected.label : <span className="mp-cs-placeholder">{placeholder}</span>}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2.2}
          className={`mp-cs-chevron ${open ? "rotated" : ""}`}
        />
      </button>

      {/* Dropdown Panel */}
      {open && (
        <ul
          className="mp-custom-select-list"
          role="listbox"
          aria-label="Options"
        >
          {normalised.map((opt) => {
            const isActive = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isActive}
                className={`mp-cs-option ${isActive ? "is-selected" : ""}`}
                onClick={() => handleSelect(opt)}
                onKeyDown={(e) => e.key === "Enter" && handleSelect(opt)}
                tabIndex={0}
              >
                <span>{opt.label}</span>
                {isActive && <Check size={13} strokeWidth={2.5} className="mp-cs-check" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ManagerSelect;
