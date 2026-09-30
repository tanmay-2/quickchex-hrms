import React from "react";
import { Search, X } from "lucide-react";
import "./SearchInput.css";

export function SearchInput({
  value = "",
  onChange,
  onClear,
  placeholder = "Search...",
  className = "",
  inputClassName = "",
  icon: Icon = null,
  clearable = true,
  disabled = false,
  autoFocus = false,
  id,
  name,
  ariaLabel,
  ...rest
}) {
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: "" } });
    }
  };

  return (
    <div className={`ui-search-input ${className}`.trim()}>
      {Icon && <Icon className="ui-search-input__icon" size={16} aria-hidden="true" />}
      <input
        type="text"
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={ariaLabel || placeholder}
        className={`ui-search-input__field ${inputClassName}`.trim()}
        {...rest}
      />
      {clearable && Boolean(value) && (
        <button
          type="button"
          onClick={handleClear}
          className="ui-search-input__clear"
          aria-label="Clear search"
          title="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export default SearchInput;
