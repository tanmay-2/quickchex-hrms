import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Check,
  ChevronDown,
} from "lucide-react";

export default function CustomDropdown({
  label,
  value,
  placeholder = "Select",
  options = [],
  onChange,
  icon: Icon,
}) {
  const [open, setOpen] =
    useState(false);

  const rootRef =
    useRef(null);

  const normalizedOptions =
    options.map((option) =>
      typeof option === "object"
        ? option
        : {
            value: option,
            label: option,
          }
    );

  const selected =
    normalizedOptions.find(
      (option) =>
        String(option.value ?? "") ===
        String(value ?? "")
    );

  useEffect(() => {
    const handleOutside =
      (event) => {
        if (
          !rootRef.current?.contains(
            event.target
          )
        ) {
          setOpen(false);
        }
      };

    const handleEscape =
      (event) => {
        if (event.key === "Escape") {
          setOpen(false);
        }
      };

    document.addEventListener(
      "mousedown",
      handleOutside
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutside
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`pay-custom-dropdown ${
        open ? "is-open" : ""
      }`}
    >
      {label && (
        <span className="pay-custom-dropdown-label">
          {label}
        </span>
      )}

      <button
        type="button"
        className="pay-custom-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() =>
          setOpen(
            (current) => !current
          )
        }
      >
        <span className="pay-custom-dropdown-left">
          {Icon && (
            <Icon
              size={15}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          )}

          <span
            className={
              selected
                ? ""
                : "is-placeholder"
            }
          >
            {selected?.label ||
              placeholder}
          </span>
        </span>

        <ChevronDown
          size={14}
          className="pay-custom-dropdown-chevron"
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="pay-custom-dropdown-menu"
          role="listbox"
        >
          {normalizedOptions.map(
            (option) => {
              const selectedOption =
                String(
                  option.value ?? ""
                ) ===
                String(value ?? "");

              return (
                <button
                  type="button"
                  key={String(
                    option.value ??
                      option.label
                  )}
                  role="option"
                  aria-selected={
                    selectedOption
                  }
                  className={`pay-custom-dropdown-option ${
                    selectedOption
                      ? "is-selected"
                      : ""
                  }`}
                  onClick={() => {
                    onChange(
                      option.value
                    );
                    setOpen(false);
                  }}
                >
                  <span>
                    {option.label}
                  </span>

                  {selectedOption && (
                    <Check
                      size={14}
                      strokeWidth={2.5}
                    />
                  )}
                </button>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
