import React, { useEffect } from "react";
import { X } from "lucide-react";

export const ManagerModal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "540px",
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: "16px",
        background: "rgba(19, 16, 32, 0.6)",
        backdropFilter: "blur(4px)",
        animation: "mpFadeIn 150ms ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth,
          background: "var(--mp-surface, #FFFFFF)",
          border: "1px solid var(--mp-border, #E6E3EE)",
          borderRadius: "16px",
          boxShadow: "var(--mp-shadow-lg)",
          overflow: "hidden",
          animation: "mpScaleUp 160ms cubic-bezier(0.16, 1, 0.3, 1)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--mp-border, #E6E3EE)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px",
            background: "var(--mp-surface-subtle, #F8F7FB)",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--mp-text-primary)" }}>
              {title}
            </h3>
            {subtitle && (
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--mp-text-muted)" }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "6px",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              color: "var(--mp-text-muted)",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>{children}</div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--mp-border, #E6E3EE)",
              background: "var(--mp-surface-subtle, #F8F7FB)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "10px",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
