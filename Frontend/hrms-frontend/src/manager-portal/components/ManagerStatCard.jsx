import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import "./ManagerStatCard.css";

export const ManagerStatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendType = "neutral", // 'up' | 'down' | 'neutral'
  badge,
  variant = "primary", // 'primary' | 'success' | 'warning' | 'danger' | 'info'
  indicator = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`mp-stat-card variant-${variant} ${onClick ? "clickable" : ""}`}
    >
      {/* Option B: Active status indicator on top right (e.g. Present Today target ring) */}
      {indicator && (
        <div className="mp-stat-top-indicator" aria-hidden="true">
          <div className="mp-stat-target-ring">
            <div className="mp-stat-target-dot" />
          </div>
        </div>
      )}

      {/* Main card row: Icon + Info */}
      <div className="mp-stat-content-row">
        {Icon && (
          <div className="mp-stat-icon-wrap">
            <Icon size={20} className="mp-stat-icon" />
          </div>
        )}

        <div className="mp-stat-info">
          <span className="mp-stat-title">{title}</span>
          <div className="mp-stat-value">{value}</div>
        </div>
      </div>

      {/* Footer info: Subtitle, trend, badges (displayed on desktop, hidden on compact mobile) */}
      {(subtitle || trend || badge) && (
        <div className="mp-stat-footer">
          {subtitle && <span className="mp-stat-subtitle">{subtitle}</span>}

          {trend && (
            <div className={`mp-stat-trend trend-${trendType}`}>
              {trendType === "up" && <ArrowUpRight size={14} />}
              {trendType === "down" && <ArrowDownRight size={14} />}
              {trend}
            </div>
          )}

          {badge && <span className="mp-stat-badge">{badge}</span>}
        </div>
      )}
    </div>
  );
};

