// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - MANAGERSELECT.JSX
// Path: Frontend/hrms-frontend/src/manager-portal/components/ManagerSelect.jsx
// Purpose: Reusable UI component 'ManagerSelect' rendering structured interface controls and visual layouts.
// UI Components:
//   • <ManagerSelect />
// Key Functions & Handlers:
//   • handleToggle()
//   • handleClickOutside()
//   • handleScrollOrResize()
//   • handleTriggerKeyDown()
//   • handleSearchKeyDown()
//   • handleSelect()
// ==============================================================================

import React, { useState, useRef, useEffect, useCallback, useMemo, useId } from "react";
import { ChevronDown, Check, Search, X, Loader2, AlertCircle } from "lucide-react";

/**
 * ManagerSelect — Premium custom dropdown for the Manager Portal (LA ESFERA design system).
 *
 * Props:
 *  value              – current selected value (string)
 *  onChange           – (value: string) => void
 *  options            – Array<{ label: string; value: string }> | string[]
 *  placeholder        – string (shown when no value selected)
 *  minWidth           – CSS string, default "160px"
 *  className          – extra class on the trigger wrapper
 *  icon: Icon         – optional Lucide icon rendered inside trigger
 *  searchable         – boolean (shows in-dropdown search field, e.g. for employee selection)
 *  searchPlaceholder  – placeholder for search input
 *  loading            – boolean (shows loading spinner)
 *  error              – string (shows error message)
 *  emptyText          – string (shown when no options match)
 *  fullWidth          – boolean (100% width, ideal for mobile stacked filters)
 *  id                 – element id for testing/accessibility
 *  style              – inline styles for outer wrapper
 *  triggerStyle       – inline styles for trigger button
 */
export const ManagerSelect = ({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  minWidth = "160px",
  className = "",
  icon: Icon,
  searchable = false,
  searchPlaceholder = "Search...",
  loading = false,
  error = null,
  emptyText = "No options available",
  fullWidth = false,
  id,
  style = {},
  triggerStyle = {},
}) => {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);
  const uniqueId = useId();
  const listId = id ? `${id}-list` : `mp-select-list-${uniqueId}`;

  // Normalise options to { label, value }
  const normalised = useMemo(() => {
    return options.map((o) =>
      typeof o === "string" ? { label: o, value: o } : o
    );
  }, [options]);

  const selected = normalised.find((o) => o.value === value);

  // Filter options based on in-dropdown search query
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return normalised;
    const q = searchQuery.toLowerCase().trim();
    return normalised.filter((opt) =>
      (opt.label && opt.label.toLowerCase().includes(q)) ||
      (opt.value && String(opt.value).toLowerCase().includes(q))
    );
  }, [normalised, searchable, searchQuery]);

  // Viewport-aware flip: intelligently open downward for upper elements and upward for bottom elements
  const updatePosition = useCallback(() => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const dropdownHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Flip upward if trigger is in lower region of the screen and space below is constrained (< 220px)
    if (rect.top > window.innerHeight * 0.45 && spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      setDropUp(true);
    } else {
      setDropUp(false);
    }
  }, []);

  const handleToggle = () => {
    if (!open) {
      updatePosition();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  // Recalculate flip on scroll or resize while open
  useEffect(() => {
    if (!open) return;
    const handleScrollOrResize = () => {
      updatePosition();
    };
    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open, updatePosition]);

  // Focus search input or scroll selected option into view when opened
  useEffect(() => {
    if (open) {
      if (searchable) {
        const timer = setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
      } else {
        const selectedIdx = filteredOptions.findIndex((o) => o.value === value);
        if (selectedIdx >= 0) {
          setFocusedIndex(selectedIdx);
        } else {
          setFocusedIndex(0);
        }
      }
    } else {
      setSearchQuery("");
      setFocusedIndex(-1);
    }
  }, [open, searchable, value, filteredOptions]);

  // Scroll focused item into view
  useEffect(() => {
    if (open && focusedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[focusedIndex];
      if (activeEl && typeof activeEl.scrollIntoView === "function") {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex, open]);

  // Keyboard navigation on trigger
  const handleTriggerKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        updatePosition();
        setOpen(true);
      } else {
        setFocusedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        updatePosition();
        setOpen(true);
      } else {
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
      }
    }
  };

  // Keyboard navigation within search input
  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[focusedIndex]);
      } else if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0]);
      }
    }
  };

  const handleSelect = (opt) => {
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={wrapRef}
      className={`mp-custom-select-wrap ${fullWidth ? "mp-full-width" : ""} ${open ? "is-active-open" : ""} ${className}`}
      style={{
        minWidth: fullWidth ? "100%" : minWidth,
        width: fullWidth ? "100%" : undefined,
        position: "relative",
        display: fullWidth ? "block" : "inline-block",
        ...style,
      }}
    >
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`mp-custom-select-trigger ${open ? "is-open" : ""}`}
        onClick={handleToggle}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        style={triggerStyle}
      >
        <span className="mp-cs-value">
          {Icon && (
            <Icon
              size={15}
              className="mp-cs-icon"
              style={{ color: "var(--mp-text-muted, #6B7280)", flexShrink: 0 }}
            />
          )}
          <span className={selected ? "mp-cs-label" : "mp-cs-placeholder"}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={15}
          strokeWidth={2.2}
          className={`mp-cs-chevron ${open ? "rotated" : ""}`}
        />
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          id={listId}
          className={`mp-custom-select-list ${dropUp ? "drop-up" : ""}`}
        >
          {/* In-Dropdown Search Field (for employee selection where supported) */}
          {searchable && (
            <div className="mp-cs-search-wrap">
              <Search size={14} className="mp-cs-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="mp-cs-search-input"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusedIndex(0);
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleSearchKeyDown}
                aria-label={searchPlaceholder}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="mp-cs-search-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {/* Options / Loading / Error / Empty States */}
          <ul
            ref={listRef}
            className="mp-cs-options-container"
            role="listbox"
            aria-label={placeholder}
          >
            {loading ? (
              <li className="mp-cs-state mp-cs-loading">
                <Loader2 size={16} className="mp-spin" />
                <span>Loading options...</span>
              </li>
            ) : error ? (
              <li className="mp-cs-state mp-cs-error">
                <AlertCircle size={15} />
                <span>{error}</span>
              </li>
            ) : filteredOptions.length === 0 ? (
              <li className="mp-cs-state mp-cs-empty">
                <span>
                  {searchQuery
                    ? `No matches for "${searchQuery}"`
                    : emptyText}
                </span>
              </li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isActive = opt.value === value;
                const isFocused = idx === focusedIndex;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isActive}
                    className={`mp-cs-option ${isActive ? "is-selected" : ""} ${isFocused ? "is-focused" : ""}`}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    tabIndex={-1}
                  >
                    <span className="mp-cs-option-label" title={opt.label}>
                      {opt.label}
                    </span>
                    {isActive && (
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className="mp-cs-check"
                      />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ManagerSelect;
