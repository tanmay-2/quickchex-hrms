import React from 'react';

export default function PageHeader({ title, subtitle, action, className = '' }) {
  if (!title && !action) return null;
  return (
    <div className={`ep-page-header-row ${className}`.trim()}>
      <div className="ep-page-header-left">
        {title && (
          <h1 className="ep-page-header-title">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="ep-page-header-subtitle">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}

