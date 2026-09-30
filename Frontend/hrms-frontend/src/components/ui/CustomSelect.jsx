import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";
import "./CustomSelect.css";

/**
 * CustomSelect — Modern, polished, high-end select dropdown.
 * Supports:
 *  - Options array [{ value, label, sublabel, icon, avatarBg, code, disabled }] OR string array
 *  - Standard <option> children parsing
 *  - Event-like or direct value onChange: onChange(val, option, event)
 *  - Keyboard navigation (arrows, Enter, Escape)
 *  - Search filtering when options > 7 or searchable=true
 *  - Custom purple theme with subtle checkmark and high z-index
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  children,
  placeholder = "Select an option...",
  searchable = false,
  disabled = false,
  prefixIcon = null,
  size = "md",
  className = "",
  id,
  name,
  error = false,
  hasError = false,
  invalid = false,
  alignRight = false,
  style = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  const isInvalid = Boolean(error || hasError || invalid);

  // Normalise options from either `options` prop or `children` (<option> tags)
  const normalisedOptions = useMemo(() => {
    if (options && options.length > 0) {
      return options.map((opt) => {
        if (typeof opt === "string" || typeof opt === "number") {
          return { value: opt, label: String(opt) };
        }
        return opt;
      });
    }

    if (children) {
      const parsed = [];
      React.Children.forEach(children, (child) => {
        if (!child) return;
        if (child.type === "option") {
          const val = child.props.value !== undefined ? child.props.value : child.props.children;
          const lbl = child.props.children !== undefined ? child.props.children : child.props.value;
          parsed.push({
            value: val,
            label: typeof lbl === "string" ? lbl : String(lbl || ""),
            disabled: child.props.disabled,
          });
        }
      });
      return parsed;
    }

    return [];
  }, [options, children]);

  // Current selected option
  const selectedOption = useMemo(() => {
    return (
      normalisedOptions.find(
        (opt) => String(opt.value ?? "") === String(value ?? "")
      ) || null
    );
  }, [normalisedOptions, value]);

  // Enable live search automatically when options count is high
  const isSearchable = searchable || normalisedOptions.length > 7;

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalisedOptions;
    const term = searchTerm.toLowerCase();
    return normalisedOptions.filter((opt) => {
      const labelMatch = String(opt.label || "").toLowerCase().includes(term);
      const sublabelMatch = String(opt.sublabel || "").toLowerCase().includes(term);
      const codeMatch = String(opt.code || "").toLowerCase().includes(term);
      return labelMatch || sublabelMatch || codeMatch;
    });
  }, [normalisedOptions, searchTerm]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm("");
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && isSearchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, isSearchable]);

  // Reset active index when options change
  useEffect(() => {
    if (isOpen) {
      const initialIdx = filteredOptions.findIndex(
        (opt) => String(opt.value ?? "") === String(value ?? "")
      );
      setActiveIndex(initialIdx >= 0 ? initialIdx : 0);
    }
  }, [isOpen, filteredOptions, value]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    if (isOpen) {
      setSearchTerm("");
      setActiveIndex(-1);
    }
  };

  const handleSelect = (option) => {
    if (option.disabled) return;
    if (onChange) {
      const val = option.value;
      const syntheticEvent = {
        target: { name: name || id || "", value: val, id: id || "" },
        currentTarget: { name: name || id || "", value: val, id: id || "" },
        value: val,
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      // Provide backwards & event-compatible callback
      onChange(val, option, syntheticEvent);
    }
    setIsOpen(false);
    setSearchTerm("");
    setActiveIndex(-1);
  };

  const handleKeyDown = useCallback(
    (e) => {
      if (disabled) return;

      if (e.key === "Escape") {
        setIsOpen(false);
        setSearchTerm("");
        setActiveIndex(-1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setActiveIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
        }
      } else if (e.key === "Enter" || (e.key === " " && !searchTerm)) {
        if (!isOpen) {
          e.preventDefault();
          setIsOpen(true);
        } else if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          e.preventDefault();
          handleSelect(filteredOptions[activeIndex]);
        }
      } else if (e.key === "Tab") {
        if (isOpen) {
          setIsOpen(false);
          setSearchTerm("");
        }
      }
    },
    [disabled, isOpen, filteredOptions, activeIndex, searchTerm]
  );

  // Helper to extract initials for avatar
  const getInitials = (nameStr = "") => {
    const parts = String(nameStr).trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (String(nameStr).slice(0, 2) || "U").toUpperCase();
  };

  return (
    <div
      ref={containerRef}
      className={`c-select-container c-select-size-${size} ${
        disabled ? "is-disabled" : ""
      } ${isOpen ? "is-open" : ""} ${isInvalid ? "has-error" : ""} ${className}`}
      id={id ? `${id}-container` : undefined}
      style={style}
    >
      {/* Hidden input for form submission if name is provided */}
      {name && <input type="hidden" name={name} value={value ?? ""} />}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        name={name}
        className="c-select-trigger"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="c-select-trigger-content">
          {prefixIcon && <span className="c-select-prefix-icon">{prefixIcon}</span>}

          {selectedOption ? (
            <div className="c-select-selected-display">
              {(selectedOption.avatarBg || selectedOption.code) && (
                <span
                  className="c-select-avatar"
                  style={{ backgroundColor: selectedOption.avatarBg || "#7c3aed" }}
                >
                  {getInitials(selectedOption.label)}
                </span>
              )}

              <span className="c-select-label-text">{selectedOption.label}</span>

              {selectedOption.code && (
                <span className="c-select-code-badge">{selectedOption.code}</span>
              )}
            </div>
          ) : (
            <span className="c-select-placeholder">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          size={15}
          className={`c-select-chevron ${isOpen ? "is-rotated" : ""}`}
        />
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div
          className={`c-select-dropdown ${alignRight ? "is-align-right" : ""}`}
          role="listbox"
        >
          {isSearchable && (
            <div className="c-select-search-wrap">
              <Search size={14} className="c-select-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="c-select-search-input"
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="c-select-search-clear"
                  onClick={() => setSearchTerm("")}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          <ul className="c-select-options-list" ref={listRef}>
            {filteredOptions.length === 0 ? (
              <li className="c-select-empty">No options found</li>
            ) : (
              filteredOptions.map((opt, index) => {
                const isSelected = String(opt.value ?? "") === String(value ?? "");
                const isActive = index === activeIndex;

                return (
                  <li
                    key={`${opt.value}-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`c-select-option ${
                      isSelected ? "is-selected" : ""
                    } ${isActive ? "is-active" : ""} ${
                      opt.disabled ? "is-disabled" : ""
                    }`}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <div className="c-select-option-left">
                      {(opt.avatarBg || opt.code) && (
                        <span
                          className="c-select-avatar"
                          style={{ backgroundColor: opt.avatarBg || "#7c3aed" }}
                        >
                          {getInitials(opt.label)}
                        </span>
                      )}
                      {opt.icon && (
                        <span className="c-select-opt-icon">{opt.icon}</span>
                      )}
                      <div className="c-select-option-text">
                        <span className="c-select-option-label">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="c-select-option-sublabel">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="c-select-option-right">
                      {opt.code && (
                        <span className="c-select-code-badge">{opt.code}</span>
                      )}
                      {isSelected && (
                        <Check size={14} className="c-select-check-icon" />
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
