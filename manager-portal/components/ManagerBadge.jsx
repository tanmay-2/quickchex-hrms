import React from "react";

/**
 * ManagerBadge — Premium status badge for the Manager Portal.
 *
 * Supported variants:
 *  - 'pending': Warm amber pill with pulsing status dot
 *  - 'present' | 'approved' | 'success': Emerald green pill with success dot
 *  - 'late' | 'warning': Warm orange pill with warning dot
 *  - 'absent' | 'rejected' | 'danger': Crimson red pill with danger dot
 *  - 'leave' | 'info': Sky blue pill with info dot
 *  - 'brand' | 'purple': Royal purple pill with brand dot
 *  - 'default' | 'neutral': Slate grey pill
 *
 * Sizes: 'sm' (22px) | 'md' (26px) | 'lg' (30px)
 */
export const ManagerBadge = ({
  variant = "default",
  children,
  dot = false,
  size = "md",
  className = "",
  style = {},
}) => {
  const norm = (variant || "default").toString().trim().toLowerCase();

  // Normalize variants to CSS suffix
  let badgeType = "default";
  if (norm.includes("pend")) {
    badgeType = "pending";
  } else if (norm.includes("appr") || norm.includes("present") || norm === "success" || norm === "active") {
    badgeType = "present";
  } else if (norm.includes("late") || norm === "warning" || norm === "warn") {
    badgeType = "late";
  } else if (norm.includes("rej") || norm.includes("absent") || norm === "danger" || norm === "error") {
    badgeType = "rejected";
  } else if (norm.includes("leave") || norm === "info") {
    badgeType = "leave";
  } else if (norm.includes("brand") || norm.includes("purple")) {
    badgeType = "brand";
  } else {
    badgeType = "default";
  }

  // Capitalize text if it's a simple string
  const formatText = (text) => {
    if (typeof text !== "string") return text;
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  return (
    <span
      className={`mp-badge mp-badge-${badgeType} mp-badge-${size} ${className}`.trim()}
      style={style}
    >
      {dot && <span className="mp-badge-dot" />}
      {typeof children === "string" ? (
        <span className="mp-badge-text">{formatText(children)}</span>
      ) : (
        children
      )}
    </span>
  );
};
