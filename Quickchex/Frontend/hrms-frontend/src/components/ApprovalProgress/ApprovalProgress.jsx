import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  ShieldCheck,
  MinusCircle,
  FileCheck2,
} from 'lucide-react';
import './ApprovalProgress.css';

function formatTimestamp(val) {
  if (!val || val === '—' || val === '-') return null;
  try {
    const str = String(val).trim();
    if (/[a-zA-Z]{3}\s+\d{1,2}/.test(str) && str.includes(':')) return str;
    const d = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(val);
  }
}

export function ApprovalProgress({
  overallStatus = '',
  managerStatus = '',
  adminStatus = '',
  managerName = '',
  managerReviewedAt = '',
  managerComment = '',
  managerRejectionReason = '',
  adminName = '',
  adminReviewedAt = '',
  adminComment = '',
  adminRejectionReason = '',
  submittedAt = '',
}) {
  const normOverall = String(overallStatus || '').toUpperCase().trim();
  const normMgr = String(managerStatus || '').toUpperCase().trim();
  const normAdmin = String(adminStatus || '').toUpperCase().trim();

  // 1. Manager Step State
  let mgrState = 'pending';
  if (
    normMgr === 'APPROVED' ||
    normOverall === 'APPROVED' ||
    normOverall === 'COMPLETED' ||
    normOverall === 'PENDING_ADMIN' ||
    normOverall === 'APPROVED_BY_MANAGER'
  ) {
    mgrState = 'approved';
  } else if (
    normMgr === 'REJECTED' ||
    normOverall === 'REJECTED_BY_MANAGER' ||
    (normOverall.includes('REJECT') && !normAdmin.includes('REJECT') && normMgr !== 'APPROVED')
  ) {
    mgrState = 'rejected';
  } else {
    mgrState = 'pending';
  }

  // 2. Admin Step State
  let adminState = 'waiting';
  if (mgrState === 'rejected') {
    adminState = 'skipped';
  } else if (normAdmin === 'APPROVED' || normOverall === 'APPROVED' || normOverall === 'COMPLETED') {
    adminState = 'approved';
  } else if (normAdmin === 'REJECTED' || normOverall === 'REJECTED_BY_ADMIN' || (normOverall.includes('REJECT') && mgrState === 'approved')) {
    adminState = 'rejected';
  } else if (mgrState === 'approved' || normOverall === 'PENDING_ADMIN' || normOverall === 'APPROVED_BY_MANAGER') {
    adminState = 'pending';
  } else {
    adminState = 'waiting';
  }

  return (
    <div className="ap-wrapper">
      <div className="ap-header">
        <span className="ap-section-tag">APPROVAL WORKFLOW</span>
        <h4 className="ap-title">Multi-Level Progress</h4>
      </div>

      <div className="ap-timeline">
        {/* Step 1: Submission */}
        <div className="ap-step is-complete">
          <div className="ap-step-rail">
            <div className="ap-step-indicator ap-step-indicator--success">
              <FileCheck2 size={14} />
            </div>
            <div className="ap-step-line is-filled" />
          </div>
          <div className="ap-step-content">
            <div className="ap-step-top">
              <strong className="ap-step-role">Request Submitted</strong>
              <span className="ap-step-badge ap-badge--success">Submitted</span>
            </div>
            <div className="ap-step-meta">
              <span>Attendance correction submitted by employee</span>
              {submittedAt && (
                <span className="ap-step-time">
                  <Clock size={11} /> {formatTimestamp(submittedAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Manager Review */}
        <div className={`ap-step ${mgrState === 'approved' ? 'is-complete' : mgrState === 'rejected' ? 'is-rejected' : 'is-active'}`}>
          <div className="ap-step-rail">
            <div className={`ap-step-indicator ${
              mgrState === 'approved' ? 'ap-step-indicator--success' :
              mgrState === 'rejected' ? 'ap-step-indicator--danger' :
              'ap-step-indicator--warning'
            }`}>
              {mgrState === 'approved' ? <CheckCircle2 size={14} /> :
               mgrState === 'rejected' ? <XCircle size={14} /> :
               <Clock size={14} />}
            </div>
            <div className={`ap-step-line ${mgrState === 'approved' ? 'is-filled' : mgrState === 'rejected' ? 'is-broken' : ''}`} />
          </div>
          <div className="ap-step-content">
            <div className="ap-step-top">
              <div className="ap-step-role-wrap">
                <strong className="ap-step-role">Level 1: Manager Review</strong>
                {managerName && <span className="ap-step-assignee"><UserCheck size={11} /> {managerName}</span>}
              </div>
              <span className={`ap-step-badge ${
                mgrState === 'approved' ? 'ap-badge--success' :
                mgrState === 'rejected' ? 'ap-badge--danger' :
                'ap-badge--warning'
              }`}>
                {mgrState === 'approved' ? 'Approved' :
                 mgrState === 'rejected' ? 'Rejected' :
                 'Pending Review'}
              </span>
            </div>
            <div className="ap-step-meta">
              <span>
                {mgrState === 'approved' ? `Approved by ${managerName || 'Reporting Manager'}` :
                 mgrState === 'rejected' ? `Rejected by ${managerName || 'Reporting Manager'}` :
                 'Awaiting Reporting Manager review'}
              </span>
              {managerReviewedAt && (
                <span className="ap-step-time">
                  <Clock size={11} /> {formatTimestamp(managerReviewedAt)}
                </span>
              )}
            </div>
            {(managerComment || managerRejectionReason) && (
              <div className={`ap-step-note ${mgrState === 'rejected' ? 'ap-step-note--danger' : ''}`}>
                <div className="ap-step-note-label">
                  {mgrState === 'rejected' ? 'Rejection Reason:' : 'Manager Remarks:'}
                </div>
                <div>{managerRejectionReason || managerComment}</div>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Admin Review */}
        <div className={`ap-step ${
          adminState === 'approved' ? 'is-complete' :
          adminState === 'rejected' ? 'is-rejected' :
          adminState === 'pending' ? 'is-active' :
          adminState === 'skipped' ? 'is-skipped' : 'is-waiting'
        }`}>
          <div className="ap-step-rail">
            <div className={`ap-step-indicator ${
              adminState === 'approved' ? 'ap-step-indicator--success' :
              adminState === 'rejected' ? 'ap-step-indicator--danger' :
              adminState === 'pending' ? 'ap-step-indicator--info' :
              'ap-step-indicator--muted'
            }`}>
              {adminState === 'approved' ? <CheckCircle2 size={14} /> :
               adminState === 'rejected' ? <XCircle size={14} /> :
               adminState === 'pending' ? <Clock size={14} /> :
               adminState === 'skipped' ? <MinusCircle size={14} /> :
               <Clock size={14} />}
            </div>
          </div>
          <div className="ap-step-content">
            <div className="ap-step-top">
              <div className="ap-step-role-wrap">
                <strong className="ap-step-role">Level 2: Admin Final Sync</strong>
                {adminName && <span className="ap-step-assignee"><ShieldCheck size={11} /> {adminName}</span>}
              </div>
              <span className={`ap-step-badge ${
                adminState === 'approved' ? 'ap-badge--success' :
                adminState === 'rejected' ? 'ap-badge--danger' :
                adminState === 'pending' ? 'ap-badge--info' :
                'ap-badge--muted'
              }`}>
                {adminState === 'approved' ? 'Ledger Synced' :
                 adminState === 'rejected' ? 'Rejected by Admin' :
                 adminState === 'pending' ? 'Pending Admin' :
                 adminState === 'skipped' ? 'Skipped' :
                 'Waiting Level 1'}
              </span>
            </div>
            <div className="ap-step-meta">
              <span>
                {adminState === 'approved' ? `Approved and attendance ledger updated by ${adminName || 'Admin'}` :
                 adminState === 'rejected' ? `Rejected by ${adminName || 'Admin'}` :
                 adminState === 'pending' ? 'Approved by manager, awaiting admin ledger synchronization' :
                 adminState === 'skipped' ? 'Workflow terminated due to Level 1 rejection' :
                 'Will be triggered upon manager approval'}
              </span>
              {adminReviewedAt && (
                <span className="ap-step-time">
                  <Clock size={11} /> {formatTimestamp(adminReviewedAt)}
                </span>
              )}
            </div>
            {(adminComment || adminRejectionReason) && (
              <div className={`ap-step-note ${adminState === 'rejected' ? 'ap-step-note--danger' : ''}`}>
                <div className="ap-step-note-label">
                  {adminState === 'rejected' ? 'Rejection Reason:' : 'Admin Remarks:'}
                </div>
                <div>{adminRejectionReason || adminComment}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApprovalProgress;
