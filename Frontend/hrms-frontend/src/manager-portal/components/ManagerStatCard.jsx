import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export const ManagerStatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendType = "neutral", // 'up' | 'down' | 'neutral'
  badge,
  variant = "primary", // 'primary' | 'success' | 'warning' | 'danger' | 'info'
  onClick,
}) => {
  const variantStyles = {
    primary: {
      iconBg: "rgba(124, 58, 237, 0.12)",
      iconColor: "#7C3AED",
      borderTop: "3px solid #7C3AED",
    },
    success: {
      iconBg: "rgba(5, 150, 105, 0.12)",
      iconColor: "#059669",
      borderTop: "3px solid #059669",
    },
    warning: {
      iconBg: "rgba(217, 119, 6, 0.12)",
      iconColor: "#D97706",
      borderTop: "3px solid #D97706",
    },
    danger: {
      iconBg: "rgba(220, 38, 38, 0.12)",
      iconColor: "#DC2626",
      borderTop: "3px solid #DC2626",
    },
    info: {
      iconBg: "rgba(2, 132, 199, 0.12)",
      iconColor: "#0284C7",
      borderTop: "3px solid #0284C7",
    },
  };

  const v = variantStyles[variant] || variantStyles.primary;

  return (
    <div
      onClick={onClick}
      className={`mp-stat-card ${onClick ? "clickable" : ""}`}
      style={{
        background: "var(--mp-surface-card, #FFFFFF)",
        border: "1px solid var(--mp-border, #E6E3EE)",
        borderTop: v.borderTop,
        borderRadius: "14px",
        padding: "18px 20px",
        boxShadow: "var(--mp-shadow-sm, 0 1px 3px rgba(0,0,0,0.05))",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        cursor: onClick ? "pointer" : "default",
        transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--mp-text-muted, #7D7590)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {title}
          </span>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--mp-text-primary, #1A1626)", marginTop: "4px", lineHeight: 1.1 }}>
            {value}
          </div>
        </div>

        {Icon && (
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: v.iconBg,
              color: v.iconColor,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={22} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: "8px" }}>
        {subtitle && (
          <span style={{ fontSize: "12.5px", color: "var(--mp-text-secondary, #544C63)", fontWeight: 500 }}>
            {subtitle}
          </span>
        )}

        {trend && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              fontWeight: 700,
              color: trendType === "up" ? "#059669" : trendType === "down" ? "#DC2626" : "var(--mp-text-muted)",
            }}
          >
            {trendType === "up" && <ArrowUpRight size={14} />}
            {trendType === "down" && <ArrowDownRight size={14} />}
            {trend}
          </div>
        )}

        {badge && (
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: v.iconColor,
              background: v.iconBg,
              padding: "3px 8px",
              borderRadius: "6px",
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              letterSpacing: "0.02em",
            }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
};
