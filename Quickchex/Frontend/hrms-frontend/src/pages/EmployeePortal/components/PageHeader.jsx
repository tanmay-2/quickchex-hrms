import React from 'react';

export default function PageHeader({ title, subtitle, action, className = '' }) {
  if (!title && !action) return null;
  return (
    <div
      className={`ep-page-header-row ${className}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '20px',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        padding: 0,
        width: '100%',
      }}
    >
      <div>
        {title && (
          <h1
            style={{
              margin: 0,
              fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif',
              fontSize: '26px',
              fontWeight: 700,
              color: 'var(--text)',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h1>
        )}
        {subtitle && (
          <p
            style={{
              margin: '6px 0 0 0',
              color: 'var(--muted)',
              fontSize: '13px',
              lineHeight: 1.45,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}

