// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - STATCARD.JSX
// Path: Frontend/hrms-frontend/src/pages/EmployeePortal/components/StatCard.jsx
// Purpose: Web portal page component managing 'StatCard' views, user interactions, and state.
// UI Components:
//   • <StatCard />
// ==============================================================================

import React from 'react';
export default function StatCard({icon:Icon, label, value, helper, tone='purple'}) { return <div className="stat-card">
  <div className={`stat-icon ${tone}`}><Icon size={19}/></div>
  <div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{helper}</small></div>
</div> }
