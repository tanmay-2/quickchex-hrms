import { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Plus, Download, Search, List, LayoutGrid,
  Users, Building2, UserPlus, Clock, CheckCircle2, AlertCircle, X,
  Trash2, ChevronLeft, ChevronRight, MapPin, Pencil,
  ChevronDown, Check, FolderOpen, Folder, UploadCloud, FileText, FileSpreadsheet, FileImage, Eye,
  Trash2 as TrashIcon, Download as DownloadIcon, LoaderCircle,
  MoreVertical, Phone, Mail, SlidersHorizontal, Filter
} from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import { useTheme } from "../../theme/ThemeProvider";
import CustomSelect from "../../components/ui/CustomSelect";
import CustomDatePicker from "../../components/ui/CustomDatePicker";
import { getEmployeeDisplayName, getInitials } from "../../utils/employeeDisplay";
import { loadUnifiedEmployees, getStoredEmployees, saveStoredEmployees, createEmployeeApi, fetchDepartmentsApi } from "../../utils/employeeStore";
import "./EmployeeDirectory.css";
import { getApiBaseUrl, getApiUrl, authHeaders } from "../../services/apiClient";

/* ---------- constants & mock data ---------- */

export function getDeptBadgeStyle(dept) {
  const d = (dept || '').trim().toLowerCase();
  if (d === 'design') {
    return { bg: '#ecfdf5', color: '#059669', border: 'rgba(5, 150, 105, 0.2)' };
  }
  if (d === 'engineering') {
    return { bg: '#ede9fe', color: '#6366f1', border: 'rgba(99, 102, 241, 0.2)' };
  }
  if (d === 'marketing') {
    return { bg: '#fffbeb', color: '#d97706', border: 'rgba(217, 119, 6, 0.2)' };
  }
  if (d === 'finance') {
    return { bg: '#f0f9ff', color: '#0284c7', border: 'rgba(2, 132, 199, 0.2)' };
  }
  if (d === 'hr') {
    return { bg: '#fdf2f8', color: '#db2777', border: 'rgba(219, 39, 119, 0.2)' };
  }
  // Default (General / others) matching reference purple badge
  return { bg: '#f5f3ff', color: '#7c3aed', border: 'rgba(124, 58, 237, 0.2)' };
}

export function getEmployeeAvatarUrl(emp) {
  if (!emp) return null;
  const raw = emp.profile_image || emp.profileImage || emp.avatar || emp.avatar_url || emp.photo || emp.image_url;
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.trim();
  if (!clean || clean === 'null' || clean === 'undefined' || clean === '—') return null;
  if (/^https?:\/\//i.test(clean) || clean.startsWith('data:image/')) return clean;
  const normalized = clean.replace(/\\/g, '/');
  const uploadIdx = normalized.toLowerCase().indexOf('/uploads/');
  if (uploadIdx !== -1) {
    return normalized.slice(uploadIdx);
  }
  return `/${normalized.replace(/^\/+/, '')}`;
}

function EmployeeAvatar({ employee, size = 44, className = "" }) {
  const displayName = getEmployeeDisplayName(employee);
  const initials = getInitials(displayName, employee?.email);
  const deptStyle = getDeptBadgeStyle(employee?.department);

  return (
    <div
      className={`ed-avatar-box ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        position: 'relative',
        overflow: 'hidden',
        background: deptStyle.bg,
        color: deptStyle.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size >= 50 ? 16 : size >= 40 ? 14 : size >= 36 ? 12.5 : 11,
        letterSpacing: '0.02em',
        flexShrink: 0,
        border: '1.5px solid rgba(255, 255, 255, 0.95)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        userSelect: 'none'
      }}
      title={displayName}
      aria-label={displayName}
    >
      <span>{initials}</span>
    </div>
  );
}

const DEPARTMENTS = ['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'Finance'];
const TONES = ['a', 'b', 'c', 'd', 'e', 'f'];
const PAGE_SIZE = 8;

const API_BASE = getApiBaseUrl();
const DOC_CATEGORIES = [
  { key: 'pan_card', label: 'PAN Card', color: '#b45309', bg: '#fef3c7' },
  { key: 'aadhaar_card', label: 'Aadhaar Card', color: '#2563eb', bg: '#dbeafe' },
  { key: 'appointment_letter', label: 'Appointment Letter', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'offer_letter', label: 'Offer Letter', color: '#059669', bg: '#d1fae5' },
  { key: 'experience_certificate', label: 'Experience Certificate', color: '#e11d48', bg: '#ffe4e6' },
  { key: 'relieving_letter', label: 'Relieving Letter', color: '#0891b2', bg: '#cffafe' },
  { key: 'educational_certificates', label: 'Educational Certificates', color: '#db2777', bg: '#fce7f3' },
  { key: 'salary_documents', label: 'Salary Documents', color: '#0f766e', bg: '#ccfbf1' },
  { key: 'address_proof', label: 'Address Proof', color: '#ea580c', bg: '#ffedd5' },
  { key: 'other_documents', label: 'Other Documents', color: '#64748b', bg: '#f1f5f9' },
];

function fileTypeIcon(fileName = '') {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileText size={18} />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet size={18} />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <FileImage size={18} />;
  return <FileText size={18} />;
}

function formatFileSize(bytes) {
  const n = Number(bytes || 0);
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function docUrl(fileUrl) {
  if (!fileUrl) return '#';
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  return `${API_BASE}/${String(fileUrl).replace(/^\//, '')}`;
}

const INITIAL_EMPLOYEES = [];

const EMPTY_FORM = {
  emp_code: '', name: '', role: '', email: '', phone: '',
  department: '', type: 'Full-time', location: '', joined: '', about: '',
  monthly_gross: '',
};

/* ---------- helpers ---------- */

function toneFor(department) {
  const idx = DEPARTMENTS.indexOf(department);
  return TONES[idx >= 0 ? idx % TONES.length : 0];
}

function parseISODate(str) {
  if (!str) return new Date(0);
  const s = String(str).trim();
  if (!s || s === '—' || s === '.') return new Date(0);
  const parts = s.split(/[-/]/).map(Number);
  if (parts.length < 3) return new Date(0);
  let y, m, d;
  if (parts[0] > 1900) {
    [y, m, d] = parts;
  } else if (parts[2] > 1900) {
    [d, m, y] = parts;
  } else {
    [y, m, d] = parts;
  }
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDate(str) {
  if (!str) return '—';
  const date = parseISODate(str);
  return isNaN(date.getTime()) || date.getTime() === 0 ? '—' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatLocation(loc) {
  if (!loc || typeof loc !== 'string') return 'Mumbai, IN';
  const clean = loc.trim();
  if (!clean || clean === '.' || clean === '-' || clean.toLowerCase() === 'null' || clean.toLowerCase() === 'undefined') {
    return 'Mumbai, IN';
  }
  // Split on *, ;, or comma
  const parts = clean
    .split(/[*;,\n\r]+/)
    .map((p) => p.trim())
    .filter((p) => p && p.length > 0 && p !== '.' && p !== '-');

  // Deduplicate case-insensitively while preserving clean capitalization
  const seen = new Set();
  const unique = [];
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      unique.push(part);
    }
  }
  if (!unique.length) return 'Mumbai, IN';
  return unique.join(', ');
}

export function cleanDepartment(rawDept) {
  if (!rawDept || typeof rawDept !== 'string') return 'Operations';
  const clean = rawDept.trim();
  if (!clean || clean === '.' || clean === '-' || clean.toLowerCase() === 'unassigned') {
    return 'Operations';
  }
  if (clean.includes('*')) {
    const parts = clean.split('*').map((p) => p.trim()).filter(Boolean);
    const hasLocationWord = parts.some((p) =>
      ['mumbai', 'india', 'maharashtra', 'delhi', 'bangalore', 'pune'].includes(p.toLowerCase())
    );
    if (hasLocationWord) return 'Operations';
    return parts[0] || 'Operations';
  }
  return clean;
}

function csvEscape(field) {
  const str = String(field == null ? '' : field);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function getPageNumbers(current, total) {
  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }
  return pages;
}

/* ---------- professional select dropdown ---------- */

function ProfessionalDropdown({ value, onChange, options, ariaLabel }) {
  return (
    <div style={{ minWidth: 165 }}>
      <CustomSelect
        value={value}
        onChange={onChange}
        options={options}
        size="md"
      />
    </div>
  );
}

/* ---------- Premium Category Select Component (Mobile & Desktop) ---------- */

function PremiumCategorySelect({ categories, activeCategory, onSelect, documents = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const activeCat = categories.find((c) => c.key === activeCategory) || categories[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="repo-premium-select-wrap" ref={containerRef} data-open={isOpen ? "true" : "false"}>
      <button
        type="button"
        id="repo-mobile-cat-select"
        className="repo-premium-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="repo-premium-trigger-left">
          <span
            className="repo-cat-dot"
            style={{ backgroundColor: activeCat.color, boxShadow: `0 0 0 3px ${activeCat.bg}` }}
            aria-hidden="true"
          />
          <span className="repo-trigger-label">{activeCat.label}</span>
        </div>
        <div className="repo-premium-trigger-right">
          <span className="repo-trigger-count-badge">
            {(documents[activeCat.key] || []).length}
          </span>
          <ChevronDown
            size={18}
            className={`repo-trigger-chevron ${isOpen ? "is-open" : ""}`}
            aria-hidden="true"
          />
        </div>
      </button>

      {isOpen && (
        <div className="repo-premium-menu" role="listbox" aria-label="Document category options">
          <div className="repo-premium-menu-inner">
            {categories.map((cat) => {
              const count = (documents[cat.key] || []).length;
              const isSelected = cat.key === activeCategory;
              return (
                <button
                  key={cat.key}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`repo-premium-option ${isSelected ? "is-selected" : ""}`}
                  onClick={() => {
                    onSelect(cat.key);
                    setIsOpen(false);
                  }}
                >
                  <div className="repo-option-left">
                    <span
                      className="repo-cat-dot"
                      style={{ backgroundColor: cat.color, boxShadow: `0 0 0 3px ${cat.bg}` }}
                      aria-hidden="true"
                    />
                    <span className="repo-option-name">{cat.label}</span>
                  </div>
                  <div className="repo-option-right">
                    <span className={`repo-option-count-pill ${count > 0 ? "has-files" : ""}`}>
                      {count} {count === 1 ? "file" : "files"}
                    </span>
                    {isSelected && <Check size={16} className="repo-option-check" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Repository Modal (Documents) ---------- */

function RepositoryModal({ employee, onClose, darkMode }) {
  const [documents, setDocuments] = useState({});
  const [activeCategory, setActiveCategory] = useState(DOC_CATEGORIES[0].key);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');

  const empCode = employee.emp_code || employee.employee_id || employee.id || '';
  const displayName = getEmployeeDisplayName(employee);

  // Lock body scroll while repository modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const parseErrorMessage = async (res, defaultMsg) => {
    try {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (json && json.detail) {
          if (typeof json.detail === 'string') return json.detail;
          if (Array.isArray(json.detail)) {
            return json.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
          }
          return typeof json.detail === 'object' ? JSON.stringify(json.detail) : String(json.detail);
        }
        if (json && json.message) return json.message;
      } catch (_) {
        if (text && text.trim().length > 0 && text.length < 200) return text;
      }
    } catch (_) {}
    return `${defaultMsg} (${res.status})`;
  };

  const loadDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      if (!empCode) {
        setDocuments({});
        return;
      }
      const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(empCode)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const msg = await parseErrorMessage(res, 'Unable to load documents');
        throw new Error(msg);
      }
      const data = await res.json();
      const grouped = {};
      DOC_CATEGORIES.forEach((cat) => { grouped[cat.key] = []; });
      (Array.isArray(data) ? data : []).forEach((doc) => {
        let cat = doc.category;
        let cleanName = doc.file_name || doc.name || 'Document';
        if (!cat && doc.file_name) {
          const match = doc.file_name.match(/^\[([a-z0-9_]+)\]\s*(.*)$/i);
          if (match) {
            cat = match[1];
            cleanName = match[2];
          } else {
            const lower = doc.file_name.toLowerCase();
            for (const c of DOC_CATEGORIES) {
              if (lower.includes(c.key) || lower.includes(c.label.toLowerCase())) {
                cat = c.key;
                break;
              }
            }
          }
        }
        cat = cat || 'other_documents';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({
          id: doc.id,
          name: cleanName,
          file_name: cleanName,
          raw_file_name: doc.file_name,
          url: doc.file_location ? (doc.file_location.startsWith('http') ? doc.file_location : `${API_BASE}/${doc.file_location.replace(/^\/+/, '')}`) : '#',
          file_location: doc.file_location,
          uploaded_at: doc.created_at || doc.upload_date || doc.uploaded_at,
          size: doc.file_size || null,
          category: cat,
          ...doc
        });
      });
      setDocuments(grouped);
    } catch (err) {
      console.warn('Repository load error:', err);
      setError(err.message || 'Failed to load employee documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [empCode]);

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || selectedFiles || []);
    if (!files.length || uploading) return;
    const allowed = new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','image/gif','image/webp']);
    const invalid = files.find((file) => file.size > 10 * 1024 * 1024 || (!allowed.has(file.type) && !/\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|gif|webp)$/i.test(file.name)));
    if (invalid) {
      setError(`Unsupported file or size limit exceeded (max 10 MB): ${invalid.name}`);
      return;
    }
    setUploading(true);
    setError('');
    setSuccessMsg('');
    try {
      for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        form.append('emp_code', empCode);
        form.append('file_name', `[${activeCategory}] ${file.name}`);
        const res = await fetch(`${API_BASE}/documents/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
        if (!res.ok) {
          const msg = await parseErrorMessage(res, `Upload failed for ${file.name}`);
          throw new Error(msg);
        }
      }
      setSelectedFiles([]);
      setSuccessMsg(`Successfully uploaded ${files.length} file${files.length === 1 ? '' : 's'}!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadDocuments();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (docId) => {
    if (deleteId !== docId) return;
    try {
      setError('');
      const res = await fetch(`${API_BASE}/documents/${docId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const msg = await parseErrorMessage(res, 'Delete failed');
        throw new Error(msg);
      }
      setDeleteId(null);
      await loadDocuments();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Delete failed.');
    }
  };

  const activeDocs = documents[activeCategory] || [];
  const activeCat = DOC_CATEGORIES.find((cat) => cat.key === activeCategory) || DOC_CATEGORIES[0];
  const totalDocs = Object.values(documents).reduce((sum, list) => sum + list.length, 0);

  return createPortal(
    <div className="repo-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Employee Documents Repository">
      <div className={`repo-modal ${darkMode ? 'repo-dark' : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* Mobile Top Drag Handle */}
        <div className="repo-drag-handle" aria-hidden="true" />

        {/* Modal Header (Option B) */}
        <div className="repo-header">
          <div className="repo-header-title">
            <div className="repo-header-icon" aria-hidden="true">
              <Folder size={22} className="repo-folder-svg" />
            </div>
            <div className="repo-header-text">
              <h2>Employee Documents</h2>
              <p>{displayName} · {empCode}</p>
            </div>
          </div>
          <button type="button" className="repo-close" onClick={onClose} aria-label="Close repository">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="repo-body">
          {/* Desktop Categories Sidebar (> 768px) */}
          <aside className="repo-sidebar">
            <div className="repo-sidebar-heading">CATEGORIES</div>
            <div className="repo-sidebar-items">
              {DOC_CATEGORIES.map((cat) => {
                const count = (documents[cat.key] || []).length;
                const active = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    className={`repo-category ${active ? 'active' : ''}`}
                    style={active ? { background: cat.bg, color: cat.color, borderColor: `${cat.color}55` } : undefined}
                    onClick={() => { setActiveCategory(cat.key); setDeleteId(null); setError(''); setSelectedFiles([]); }}
                  >
                    <span className="repo-category-name">
                      <span className="repo-category-dot" style={{ background: cat.color }} />
                      {cat.label}
                    </span>
                    <span className="repo-count" style={active ? { background: cat.color, color: '#fff' } : undefined}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="repo-main">
            {/* Mobile Category Dropdown (Option B, <= 768px) */}
            <div className="repo-mobile-category-block">
              <label htmlFor="repo-mobile-cat-select" className="repo-field-label">
                Document category
              </label>
              <PremiumCategorySelect
                categories={DOC_CATEGORIES}
                activeCategory={activeCategory}
                onSelect={(catKey) => {
                  setActiveCategory(catKey);
                  setDeleteId(null);
                  setError('');
                  setSelectedFiles([]);
                }}
                documents={documents}
              />
              <div className="repo-category-count-caption">
                {activeDocs.length} file{activeDocs.length === 1 ? '' : 's'} in this category
              </div>
            </div>

            {/* Desktop Selected Category Eyebrow (> 768px) */}
            <div className="repo-desktop-cat-info">
              <div>
                <div className="repo-eyebrow">SELECTED CATEGORY</div>
                <h3 style={{ color: activeCat.color }}>{activeCat.label}</h3>
                <p>{activeDocs.length} file{activeDocs.length === 1 ? '' : 's'} in this category</p>
              </div>
            </div>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files.length) {
                  setSelectedFiles(Array.from(e.target.files));
                  setError('');
                }
                e.target.value = '';
              }}
              disabled={uploading}
              aria-label="File picker"
            />

            {/* Upload Controls Row (Option B) */}
            <div className="repo-upload-controls-row">
              <button
                type="button"
                className="repo-btn-choose"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <FileText size={17} />
                <span>Choose files</span>
              </button>

              <button
                type="button"
                className="repo-btn-upload"
                onClick={() => {
                  if (selectedFiles.length > 0) {
                    uploadFiles(selectedFiles);
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <LoaderCircle size={17} className="repo-spin" />
                    <span>Uploading…</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={17} />
                    <span>Upload files</span>
                  </>
                )}
              </button>
            </div>

            {/* Staged / Selected Files Notice */}
            {selectedFiles.length > 0 && !uploading && (
              <div className="repo-staged-box">
                <div className="repo-staged-info">
                  <FileText size={15} />
                  <span>
                    Ready to upload: <b>{selectedFiles.map((f) => f.name).join(', ')}</b> ({formatFileSize(selectedFiles.reduce((s, f) => s + f.size, 0))})
                  </span>
                </div>
                <button
                  type="button"
                  className="repo-staged-clear"
                  onClick={() => setSelectedFiles([])}
                  title="Clear selected files"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="repo-error" role="alert">
                <AlertCircle size={15} />
                <span>{error}</span>
                <button type="button" onClick={() => setError('')} title="Dismiss error">
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Success Banner */}
            {successMsg && (
              <div className="repo-success" role="status">
                <CheckCircle2 size={15} />
                <span>{successMsg}</span>
                <button type="button" onClick={() => setSuccessMsg('')} title="Dismiss">
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Drag & Drop Upload Zone (Option B) */}
            <div
              className={`repo-dropzone ${dragOver ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer?.files?.length) {
                  uploadFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              aria-label="Upload files drop zone"
            >
              <div className="repo-drop-icon">
                <UploadCloud size={24} />
              </div>
              <div className="repo-drop-primary-text">
                Drop files here or <span className="repo-drop-browse">browse</span>
              </div>
              <div className="repo-drop-subtext">
                PDF, Word, Excel or images · Max 10 MB per file
              </div>
            </div>

            {/* Uploaded Files Section Header (Option B) */}
            <div className="repo-list-head">
              <span className="repo-list-head-title">Uploaded files</span>
              <span className="repo-list-head-badge">{activeDocs.length}</span>
            </div>

            {/* Document List or Empty State */}
            <div className="repo-doc-list">
              {loading ? (
                <div className="repo-state">
                  <LoaderCircle className="repo-spinner" size={24} />
                  <span>Loading documents…</span>
                </div>
              ) : activeDocs.length > 0 ? (
                activeDocs.map((doc) => {
                  const fileName = doc.file_name || doc.original_name || doc.filename || 'Unnamed file';
                  const url = doc.url || docUrl(doc.file_location || doc.path);
                  const confirming = deleteId === doc.id;
                  return (
                    <div className="repo-doc-row" key={doc.id}>
                      <div className="repo-file-icon" style={{ color: activeCat.color, background: activeCat.bg }}>
                        {fileTypeIcon(fileName)}
                      </div>
                      <div className="repo-file-info">
                        <div className="repo-file-name" title={fileName}>{fileName}</div>
                        <div className="repo-file-meta">
                          {formatFileSize(doc.size || doc.file_size)}
                          {doc.uploaded_at ? ` · ${new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                        </div>
                      </div>
                      <div className="repo-file-actions">
                        <a className="repo-action view" href={url} target="_blank" rel="noopener noreferrer" title="View Document">
                          <Eye size={15} />
                        </a>
                        <a className="repo-action download" href={url} download={fileName} title="Download Document">
                          <DownloadIcon size={15} />
                        </a>
                        {confirming ? (
                          <div className="repo-confirm">
                            <span>Delete?</span>
                            <button type="button" className="repo-action confirm" onClick={() => deleteDocument(doc.id)} title="Confirm delete">
                              <CheckCircle2 size={15} />
                            </button>
                            <button type="button" className="repo-action cancel" onClick={() => setDeleteId(null)} title="Cancel">
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <button type="button" className="repo-action delete" onClick={() => setDeleteId(doc.id)} title="Delete Document">
                            <TrashIcon size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="repo-option-b-empty">
                  <div className="repo-empty-rays-art" aria-hidden="true">
                    <div className="repo-empty-sunburst">
                      <span className="sun-ray ray-l" />
                      <span className="sun-ray ray-m" />
                      <span className="sun-ray ray-r" />
                    </div>
                    <FileText size={42} strokeWidth={1.4} className="repo-empty-doc-icon" />
                  </div>
                  <strong className="repo-empty-title">No files yet</strong>
                  <p className="repo-empty-sub">Your uploaded documents will appear here.</p>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Persistent Modal Footer (Option B) */}
        <div className="repo-footer">
          <button type="button" className="repo-footer-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ---------- Main Component Wrapper ---------- */

export default function EmployeeDirectory(props) {
  const isInsideShell = useContext(DashboardShellContext);

  if (!isInsideShell) {
    return (
      <DashboardShell>
        <EmployeeDirectoryContent {...props} />
      </DashboardShell>
    );
  }

  return <EmployeeDirectoryContent {...props} />;
}

/* ---------- Employee Directory Content ---------- */

function EmployeeDirectoryContent() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const darkMode = theme === 'dark';

  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [activeGridMenuId, setActiveGridMenuId] = useState(null);
  const [page, setPage] = useState(1);
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);
  const [modalServerError, setModalServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableDepartments, setAvailableDepartments] = useState(DEPARTMENTS);
  const [repositoryEmployee, setRepositoryEmployee] = useState(null);

  // Import Mastersheet State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFiles, setImportFiles] = useState([]);
  const [importDragOver, setImportDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [isParsingPreview, setIsParsingPreview] = useState(false);

  const handleCancelImport = () => {
    setIsImportModalOpen(false);
    setImportFiles([]);
    setImportPreview(null);
    setIsParsingPreview(false);
    setIsImporting(false);
    setErrors((prev) => ({ ...prev, import: undefined }));
  };

  const loadEmployeesFromDb = async () => {
    try {
      const loaded = await loadUnifiedEmployees();
      if (Array.isArray(loaded)) {
        setEmployees(loaded);
      }
    } catch (err) {
      console.warn("Could not load employees from DB, falling back to local cache:", err);
      const stored = getStoredEmployees();
      if (stored.length > 0) setEmployees(stored);
    }
  };

  useEffect(() => {
    loadEmployeesFromDb();
  }, []);

  useEffect(() => {
    let active = true;
    fetchDepartmentsApi()
      .then((depts) => {
        if (active && Array.isArray(depts) && depts.length > 0) {
          setAvailableDepartments(depts);
        }
      })
      .catch((e) => console.warn('Could not fetch departments:', e));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!alert) return undefined;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  useEffect(() => {
    if (!activeGridMenuId) return;
    const handleDocClick = () => setActiveGridMenuId(null);
    window.addEventListener('click', handleDocClick);
    return () => window.removeEventListener('click', handleDocClick);
  }, [activeGridMenuId]);

  useEffect(() => {
    if (isModalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isModalOpen]);

  useEffect(() => {
    setPage(1);
  }, [search, deptFilter, sortBy, typeFilter, view]);

  const filteredEmployees = useMemo(() => {
    const term = (search || '').trim().toLowerCase();
    let list = (employees || []).filter((emp) => {
      const matchesSearch =
        !term ||
        (emp.name || '').toLowerCase().includes(term) ||
        (emp.first_name || '').toLowerCase().includes(term) ||
        (emp.last_name || '').toLowerCase().includes(term) ||
        (emp.role || '').toLowerCase().includes(term) ||
        (emp.designation || '').toLowerCase().includes(term) ||
        (emp.emp_code || '').toLowerCase().includes(term) ||
        (emp.email || '').toLowerCase().includes(term) ||
        (emp.department || '').toLowerCase().includes(term);
      const matchesDept =
        deptFilter === 'all' ||
        (deptFilter === 'Unassigned'
          ? !emp.department || emp.department === '.' || emp.department.toLowerCase() === 'unassigned'
          : emp.department === deptFilter);
      const empType = (emp.type || emp.employment_type || 'Full-time').toLowerCase();
      const matchesType = typeFilter === 'all' || empType === typeFilter.toLowerCase();
      return matchesSearch && matchesDept && matchesType;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'recent') return parseISODate(b.joined) - parseISODate(a.joined);
      if (sortBy === 'tenure') return parseISODate(a.joined) - parseISODate(b.joined);
      return 0;
    });
    return list;
  }, [employees, search, deptFilter, sortBy, typeFilter]);

  const deptFilterOptions = useMemo(() => {
    const validSet = new Set();
    let hasUnassigned = false;
    (employees || []).forEach((e) => {
      const d = (e.department || '').trim();
      if (!d || d === '.' || d.toLowerCase() === 'unassigned') {
        hasUnassigned = true;
      } else {
        validSet.add(d);
      }
    });
    const opts = [{ value: 'all', label: 'All Departments' }];
    Array.from(validSet).sort().forEach((d) => opts.push({ value: d, label: d }));
    if (hasUnassigned) {
      opts.push({ value: 'Unassigned', label: 'Unassigned' });
    }
    return opts;
  }, [employees]);

  const stats = useMemo(() => {
    const total = employees.length;
    const validDepts = new Set(
      employees
        .map((e) => (e.department || '').trim())
        .filter((d) => d && d !== '.' && d.toLowerCase() !== 'unassigned')
    );
    const departments = validDepts.size;
    const currentYear = new Date().getFullYear();
    const newHires = employees.filter((e) => {
      const d = parseISODate(e.joined);
      return !isNaN(d.getTime()) && d.getTime() > 0 && d.getFullYear() === currentYear;
    }).length;
    const fullTime = employees.filter((e) => (e.type || e.employment_type || '').toLowerCase().includes('full')).length;
    const interns = employees.filter((e) => (e.type || e.employment_type || '').toLowerCase().includes('intern')).length;
    const onContract = employees.filter((e) => (e.type || e.employment_type || '').toLowerCase().includes('contract')).length;
    const growthRate = total > 0 ? Math.round((newHires / total) * 100) : 0;
    return { total, departments, newHires, onContract, fullTime, interns, growthRate };
  }, [employees]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredEmployees.slice(start, start + PAGE_SIZE);
  }, [filteredEmployees, safePage]);
  const pageNumbers = useMemo(() => getPageNumbers(safePage, totalPages), [safePage, totalPages]);
  const rangeStart = filteredEmployees.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filteredEmployees.length);

  function showAlert(type, message) {
    setAlert({ type, message });
  }

  function openAddModal() {
    setModalMode('add');
    setEditingId(null);
    setModalServerError('');
    setFormData({
      ...EMPTY_FORM,
      emp_code: `LE${Math.floor(100 + Math.random() * 900)}`,
      joined: todayISO(),
      department: availableDepartments[0] || 'Engineering'
    });
    setErrors({});
    setIsModalOpen(true);
  }

  function openProfile(emp) {
    const targetId = emp.emp_code || emp.id || emp.employeeId;
    navigate(`/dashboard/employees/${encodeURIComponent(targetId)}`, { state: { employee: emp } });
  }

  function openEditModal(emp) {
    setModalMode('edit');
    setEditingId(emp.id || emp.emp_code);
    setModalServerError('');
    const cleanDisplayName = getEmployeeDisplayName(emp);
    const modalName = (emp.name && emp.email && emp.name.trim().toLowerCase() === emp.email.trim().toLowerCase()) ? '' : (emp.name || '');
    setFormData({
      emp_code: emp.emp_code || emp.id || '',
      name: modalName,
      role: emp.designation || emp.role || '',
      email: emp.email || '',
      phone: emp.phone || emp.mobile || emp.mobile_no || '',
      department: cleanDepartment(emp.department) || 'Operations',
      type: emp.type || emp.employment_type || 'Full-time',
      location: formatLocation(emp.location || emp.branch_location),
      joined: emp.joined || emp.joining_date || todayISO(),
      about: emp.about || '',
    });
    setErrors({});
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setModalServerError('');
  }

  function handleOverlayClick(e) {
    if (isSubmitting) return;
    if (e.target === e.currentTarget) setIsModalOpen(false);
  }

  function updateField(key, value) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (modalServerError) setModalServerError('');
  }

  function validate(data) {
    const errs = {};
    if (!data.emp_code || !data.emp_code.trim()) errs.emp_code = 'Employee ID is required.';
    if (!data.name || !data.name.trim()) errs.name = 'Full Name is required.';
    if (!data.role || !data.role.trim()) errs.role = 'Role / Title is required.';
    if (!data.email || !data.email.trim()) {
      errs.email = 'Work Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errs.email = 'Enter a valid work email address.';
    }
    if (!data.department || !data.department.trim()) errs.department = 'Department is required.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setModalServerError('');
    const errs = validate(formData);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const cleanCode = formData.emp_code.trim();
    const displayName = (formData.name || '').trim();
    const parts = displayName.split(' ').filter(Boolean);
    const first = parts[0] || '';
    const last = parts.length > 1 ? parts.slice(1).join(' ') : '';

    setIsSubmitting(true);
    if (modalMode === 'add') {
      try {
        const salaryVal = formData.monthly_gross ? parseFloat(formData.monthly_gross) : null;
        const payload = {
          emp_code: cleanCode,
          name: displayName,
          first_name: first,
          last_name: last,
          password: 'Admin@123',
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone ? formData.phone.trim() : '',
          mobile: formData.phone ? formData.phone.trim() : '',
          role: 'employee', // System Access Role
          designation: formData.role.trim(), // Job Title
          department: formData.department,
          employment_type: formData.type || 'Full-time',
          type: formData.type || 'Full-time',
          location: formData.location ? formData.location.trim() : 'Mumbai, IN',
          joining_date: formData.joined || todayISO(),
          joined: formData.joined || todayISO(),
          about: formData.about ? formData.about.trim() : '',
          monthly_gross: salaryVal,
          salary: salaryVal,
        };

        const result = await createEmployeeApi(payload);
        closeModal();
        const successMsg = result?.message || (salaryVal ? 'Employee added successfully. Payroll profile initialized.' : 'Employee added successfully. Payroll profile created — salary setup is still required before the first payslip can be generated.');
        showAlert('success', successMsg);
        await loadEmployeesFromDb();

        window.dispatchEvent(new Event("employees-updated"));
        window.dispatchEvent(new Event("payroll-updated"));
        try {
          localStorage.setItem('hrms_last_event', JSON.stringify({ type: 'employees-updated', emp_code: cleanCode, timestamp: Date.now() }));
        } catch (e) { }
      } catch (err) {
        console.error('Create employee error:', err);
        setModalServerError(err.message || 'Unable to create employee. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const res = await fetch(`${API_BASE}/profile/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            emp_code: cleanCode,
            first_name: first,
            last_name: last,
            email: formData.email.trim(),
            mobile: formData.phone || '',
            department: formData.department,
            designation: formData.role,
            employment_type: formData.type,
            location: formData.location,
            joining_date: formData.joined,
            about: formData.about,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.detail || errData?.message || 'Failed to update employee profile.');
        }
        closeModal();
        showAlert('success', `Employee profile ${cleanCode} updated.`);
        await loadEmployeesFromDb();
      } catch (err) {
        console.error('Update profile error:', err);
        setModalServerError(err.message || 'Failed to update employee profile.');
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  function handleDelete(emp, e) {
    e.stopPropagation();
    setEmployees((prev) => prev.filter((x) => x.id !== emp.id));
    showAlert('success', `${emp.name} was removed from the directory.`);
  }

  function handleDeleteFromModal() {
    const emp = employees.find((x) => x.id === editingId);
    setEmployees((prev) => prev.filter((x) => x.id !== editingId));
    setIsModalOpen(false);
    if (emp) showAlert('success', `${emp.name} was removed from the directory.`);
  }

  function handleExport() {
    const headers = ['Name', 'Role', 'Department', 'Email', 'Phone', 'Location', 'Type', 'Joined'];
    const rows = employees.map((e) => [e.name, e.role, e.department, e.email, e.phone, e.location, e.type, e.joined]);
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee-directory.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showAlert('success', `Exported ${employees.length} employees to CSV.`);
  }

  function handleActivateKey(e, callback) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Import Mastersheet functions
  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([{
      Name: 'John Doe',
      Role: 'Software Engineer',
      Department: 'Engineering',
      Email: 'john.doe@yourcompany.com',
      Phone: '+1 (555) 123-4567',
      Location: 'Remote',
      Type: 'Full-time',
      Joined: '2026-01-15',
      About: 'Passionate about coding.'
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Employee_Import_Template.xlsx");
  }

  function addImportFiles(fileList) {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const newFiles = [];
    let hasInvalid = false;

    Array.from(fileList || []).forEach((file) => {
      const isVal = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
      if (isVal) {
        newFiles.push(file);
      } else {
        hasInvalid = true;
      }
    });

    if (newFiles.length > 0) {
      setImportFiles((prev) => {
        const existingKeys = new Set(prev.map((f) => `${f.name}_${f.size}`));
        const unique = newFiles.filter((f) => !existingKeys.has(`${f.name}_${f.size}`));
        return [...prev, ...unique];
      });
      setErrors((prev) => ({ ...prev, import: undefined }));
    }
    if (hasInvalid) {
      setErrors((prev) => ({ ...prev, import: "Some files were skipped. Only .xlsx, .xls, and .csv files are supported." }));
    }
  }

  function handleImportFileDrop(e) {
    e.preventDefault();
    setImportDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addImportFiles(e.dataTransfer.files);
    }
  }

  function handleImportFileSelect(e) {
    if (e.target.files && e.target.files.length > 0) {
      addImportFiles(e.target.files);
    }
    e.target.value = '';
  }

  function removeImportFile(index) {
    setImportFiles((prev) => prev.filter((_, i) => i !== index));
  }

function parseUniversalEmployeeRow(rowObj, rowArray = []) {
  const entries = [];
  if (rowObj && typeof rowObj === 'object') {
    Object.entries(rowObj).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        const rawKey = String(k).trim();
        const cleanKey = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '');
        entries.push({ key: rawKey, cleanKey, val: String(v).trim(), rawVal: v });
      }
    });
  }

  if (entries.length === 0 && rowArray && Array.isArray(rowArray)) {
    rowArray.forEach((v, idx) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        entries.push({ key: `col_${idx}`, cleanKey: `col_${idx}`, val: String(v).trim(), rawVal: v });
      }
    });
  }

  if (!entries.length) return null;

  // Helper keyword matcher
  const getVal = (keywords) => {
    for (const kw of keywords) {
      const match = entries.find((e) => e.cleanKey === kw || e.cleanKey.includes(kw) || e.key.toLowerCase().includes(kw));
      if (match) return match.val;
    }
    return '';
  };

  // 1. Employee Code / ID
  let empCode = getVal(['empcode', 'employeecode', 'empid', 'employeeid', 'usercode', 'userid', 'staffid', 'staffcode', 'staffno', 'code', 'id', 'serial', 'srno', 'number', 'no']);

  // 2. Name
  let name = getVal(['fullname', 'employeename', 'employeenamefull', 'membername', 'username', 'staffname', 'personname', 'employee', 'user', 'staff', 'person', 'name', 'empname']);
  let firstName = getVal(['firstname', 'fname', 'first', 'givenname']);
  let middleName = getVal(['middlename', 'mname', 'middle']);
  let lastName = getVal(['lastname', 'lname', 'last', 'surname', 'familyname']);

  if (!name && (firstName || lastName)) {
    name = `${firstName || ''} ${middleName || ''} ${lastName || ''}`.replace(/\s+/g, ' ').trim();
  }

  // 3. Email
  let email = getVal(['officialemail', 'emailid', 'emailaddress', 'email', 'mail', 'officialmail', 'workemail', 'personalemail', 'e_mail', 'useremail', 'empemail']);
  if (!email) {
    const emailEntry = entries.find((e) => e.val.includes('@') && e.val.includes('.'));
    if (emailEntry) email = emailEntry.val;
  }

  // If name matches email case-insensitively or is an email address, set name to null
  if (name && (name.includes('@') || (email && name.toLowerCase().trim() === email.toLowerCase().trim()))) {
    name = null;
  }

  // 4. Phone
  let phone = getVal(['mobileno', 'mobile', 'phone', 'phonenumber', 'contact', 'contactno', 'cell', 'telephone', 'mobile_no', 'phone_no', 'whatsapp']);
  if (!phone) {
    const phoneEntry = entries.find((e) => e.val.replace(/[^0-9]/g, '').length >= 10 && !e.val.includes('@'));
    if (phoneEntry) phone = phoneEntry.val;
  }
  const cleanPhone = String(phone || '9999999999').replace(/[^0-9+]/g, '') || '9999999999';

  // 5. Designation / Role
  let designation = getVal(['designation', 'jobtitle', 'position', 'title', 'post', 'roletitle', 'occupation', 'worktype', 'job']);
  let role = getVal(['role', 'accessrole', 'userrole']);
  if (!designation) designation = role || 'Employee';
  if (!role) role = 'employee';

  // 6. Department (Do not mix with location/branch)
  let dept = getVal(['department', 'dept', 'division', 'section', 'team', 'group', 'unit']);
  dept = cleanDepartment(dept);

  // 7. Location
  let loc = getVal(['location', 'branch', 'city', 'site', 'office', 'address', 'worklocation', 'residentialaddress']);
  if (!loc) loc = 'Mumbai, IN';

  // 8. Type
  let type = getVal(['employmenttype', 'type', 'status', 'emp_type', 'work_type', 'category']);
  if (!type) type = 'Full-time';

  // 9. Joining Date
  let rawJoined = getVal(['dateofjoining', 'doj', 'joiningdate', 'joined', 'startdate', 'hiredate', 'date_of_joining', 'date']);
  let joined = todayISO();

  if (rawJoined) {
    if (rawJoined instanceof Date) {
      joined = rawJoined.toISOString().split('T')[0];
    } else if (typeof rawJoined === 'number') {
      const dateObj = new Date((rawJoined - 25569) * 86400 * 1000);
      if (!isNaN(dateObj.getTime())) joined = dateObj.toISOString().split('T')[0];
    } else if (typeof rawJoined === 'string' && rawJoined.trim()) {
      const d = parseISODate(rawJoined.trim());
      if (!isNaN(d.getTime()) && d.getTime() > 0) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        joined = `${y}-${m}-${day}`;
      }
    }
  }

  // 10. Salary
  let rawSalary = getVal(['salary', 'monthlygross', 'grosssalary', 'monthlysalary', 'gross', 'ctc', 'annualctc', 'pay', 'basic', 'remuneration']);
  const salary = parseFloat(String(rawSalary).replace(/[^0-9.]/g, '')) || null;

  // Ignore header rows captured as data
  const nameLower = String(name || '').toLowerCase().trim();
  const codeLower = String(empCode || '').toLowerCase().trim();
  if (
    nameLower === 'name' ||
    nameLower === 'employee name' ||
    nameLower === 'full name' ||
    nameLower === 'user name' ||
    codeLower === 'code' ||
    codeLower === 'emp code' ||
    codeLower === 'employee id' ||
    codeLower === 'id'
  ) {
    return null;
  }

  // Skip completely empty rows
  if (!name && !empCode && !email) {
    return null;
  }

  const cleanCode = String(empCode || `EMP-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`).trim();
  const resolvedEmail = String(email || `${cleanCode.toLowerCase()}@laesfera.co`).trim();

  let resolvedFirst = firstName || null;
  let resolvedMiddle = middleName || null;
  let resolvedLast = lastName || null;
  let resolvedName = name ? name.trim() : null;

  if (resolvedName) {
    const parts = resolvedName.split(' ').filter(Boolean);
    if (!resolvedFirst) resolvedFirst = parts[0] || null;
    if (!resolvedLast && parts.length > 1) resolvedLast = parts[parts.length - 1];
  }

  // 11. Reporting Supervisor / Manager
  let supervisor = getVal(['reportingmanager', 'manager', 'reports_to', 'reportsto', 'managername', 'reportinghead', 'head', 'rm', 'reportingsupervisoremail']);

  return {
    ...(rowObj || {}),
    id: cleanCode,
    emp_code: cleanCode,
    first_name: resolvedFirst,
    middle_name: resolvedMiddle,
    last_name: resolvedLast,
    name: resolvedName,
    role,
    designation,
    department: dept,
    email: resolvedEmail,
    phone: cleanPhone,
    location: loc,
    type,
    joined: String(joined),
    about: '',
    salary,
    reporting_supervisor: supervisor || null,
    raw_row: rowObj,
  };
}

  const generateImportPreview = async (filesToProcess) => {
    const files = filesToProcess || importFiles;
    if (!files || !files.length) {
      setImportPreview(null);
      return;
    }
    setIsParsingPreview(true);
    setErrors((prev) => ({ ...prev, import: undefined }));

    try {
      let allParsed = [];

      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, raw: false });

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) return;

          const jsonObjects = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          const extractedFromSheet = [];

          if (jsonObjects && jsonObjects.length > 0) {
            jsonObjects.forEach((rowObj) => {
              const emp = parseUniversalEmployeeRow(rowObj);
              if (emp) extractedFromSheet.push(emp);
            });
          }

          if (!extractedFromSheet.length && rawRows && rawRows.length > 0) {
            let headerIdx = -1;
            for (let r = 0; r < Math.min(20, rawRows.length); r++) {
              const rowArr = rawRows[r] || [];
              const rowStr = rowArr.map((c) => String(c || '').toLowerCase().trim());
              if (rowStr.some((c) => c.length > 0)) {
                headerIdx = r;
                break;
              }
            }
            if (headerIdx === -1) headerIdx = 0;

            const headerRow = rawRows[headerIdx] || [];
            const dataRows = rawRows.slice(headerIdx + 1);

            dataRows.forEach((rowCells) => {
              if (!rowCells || !rowCells.some((c) => c !== null && String(c).trim() !== '')) return;
              const rowObj = {};
              headerRow.forEach((h, colIdx) => {
                const key = h !== undefined && h !== null && String(h).trim() !== '' ? String(h).trim() : `col_${colIdx}`;
                rowObj[key] = rowCells[colIdx];
              });
              const emp = parseUniversalEmployeeRow(rowObj, rowCells);
              if (emp) extractedFromSheet.push(emp);
            });
          }

          allParsed.push(...extractedFromSheet);
        });
      }

      // Deduplicate parsed employees by emp_code or email
      const seen = new Set();
      const uniqueEmployees = [];
      const existingCodes = new Set((employees || []).map((e) => String(e.emp_code || e.id).toLowerCase().trim()));
      const existingEmails = new Set((employees || []).map((e) => String(e.email || '').toLowerCase().trim()));

      let adminCount = 0;
      let managerCount = 0;
      let employeeCount = 0;
      let newCount = 0;
      let updateCount = 0;

      for (const emp of allParsed) {
        const normEmail = emp.email ? emp.email.trim().toLowerCase() : null;
        const normCode = emp.emp_code ? emp.emp_code.trim().toLowerCase() : null;
        const key = normCode ? `code_${normCode}` : (normEmail ? `email_${normEmail}` : null);

        if (key && !seen.has(key)) {
          seen.add(key);
          const isUpdate = Boolean((normCode && existingCodes.has(normCode)) || (normEmail && existingEmails.has(normEmail)));
          if (isUpdate) updateCount++;
          else newCount++;

          const roleLower = String(emp.role || emp.designation || '').toLowerCase();
          if (roleLower.includes('admin') || roleLower.includes('director')) adminCount++;
          else if (roleLower.includes('manager') || roleLower.includes('lead') || roleLower.includes('head')) managerCount++;
          else employeeCount++;

          uniqueEmployees.push({
            ...emp,
            isUpdate
          });
        }
      }

      if (!uniqueEmployees.length) {
        throw new Error("No valid employee records could be parsed from the selected sheet(s).");
      }

      setImportPreview({
        totalRows: uniqueEmployees.length,
        newCount,
        updateCount,
        adminCount,
        managerCount,
        employeeCount,
        parsedEmployees: uniqueEmployees,
      });
    } catch (err) {
      setErrors((prev) => ({ ...prev, import: err.message || "Failed to generate preview." }));
      setImportPreview(null);
    } finally {
      setIsParsingPreview(false);
    }
  };

  async function handleImportSubmit(e) {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!importPreview || !importPreview.parsedEmployees || !importPreview.parsedEmployees.length) {
      if (importFiles && importFiles.length > 0) {
        await generateImportPreview(importFiles);
      }
      return;
    }

    setIsImporting(true);
    setErrors((prev) => ({ ...prev, import: undefined }));

    try {
      const itemsToSync = importPreview.parsedEmployees;
      const formattedItems = itemsToSync.map((emp) => ({
        ...(emp.raw_row || {}),
        emp_code: String(emp.emp_code || '').trim(),
        name: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || null,
        first_name: emp.first_name || null,
        middle_name: emp.middle_name || null,
        last_name: emp.last_name || null,
        email: emp.email || `${String(emp.emp_code || '').toLowerCase()}@laesfera.co`,
        mobile_no: emp.phone || emp.mobile_no || '9999999999',
        role: (emp.role && emp.role !== 'Employee' && emp.role !== 'employee' && (emp.role === 'admin' || emp.role === 'manager')) ? emp.role : 'employee',
        designation: emp.designation || 'Employee',
        department: emp.department || 'Unassigned',
        location: emp.location || 'Mumbai, IN',
        manager: emp.reporting_supervisor || emp.manager || null,
        manager_code: emp.reporting_supervisor || emp.manager_code || null,
        joining_date: emp.joined || todayISO(),
        employment_type: emp.type || emp.employment_type || 'Full-time',
      }));

      // 1. Bulk import request to backend
      let apiSuccess = false;
      let syncResult = null;
      let lastErrorMessage = "";

      const tryEndpoints = [
        getApiUrl("/api/v1/admin/employees/import-mastersheet"),
        getApiUrl("/admin/employees/import-mastersheet"),
        `${API_BASE}/api/v1/admin/employees/import-mastersheet`,
        `/api/v1/admin/employees/import-mastersheet`
      ];

      const requestHeaders = authHeaders({ 'Content-Type': 'application/json' });

      for (const endpoint of tryEndpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify({ employees: formattedItems }),
          });

          if (res.ok) {
            syncResult = await res.json();
            apiSuccess = true;
            break;
          } else {
            const errJson = await res.json().catch(() => null);
            lastErrorMessage = errJson?.detail || `Server returned ${res.status}: ${res.statusText}`;
          }
        } catch (fetchErr) {
          console.warn(`Endpoint ${endpoint} failed:`, fetchErr);
          lastErrorMessage = fetchErr.message;
        }
      }

      if (!apiSuccess) {
        throw new Error(lastErrorMessage || "Failed to persist imported employees to backend database.");
      }

      // 2. Fetch authoritative saved records from DB & update local state
      await loadEmployeesFromDb();

      // 3. Merge into local store for instant UI reactivity
      try {
        const stored = getStoredEmployees();
        const codeMap = new Map();
        (stored || []).forEach(e => codeMap.set(String(e.emp_code || e.id).toLowerCase(), e));
        formattedItems.forEach(emp => {
          codeMap.set(String(emp.emp_code || emp.id).toLowerCase(), {
            id: emp.emp_code,
            emp_code: emp.emp_code,
            name: emp.name,
            first_name: emp.first_name,
            middle_name: emp.middle_name,
            last_name: emp.last_name,
            email: emp.email,
            phone: emp.mobile_no,
            role: emp.role,
            designation: emp.designation,
            department: emp.department,
            location: emp.location,
            joined: emp.joining_date,
            type: emp.employment_type,
            reporting_supervisor: emp.manager
          });
        });
        const mergedList = Array.from(codeMap.values());
        saveStoredEmployees(mergedList);
        setEmployees(mergedList);
      } catch (storeErr) {
        console.warn("Could not cache to local employee store:", storeErr);
      }

      const createdCount = syncResult?.created ?? importPreview.newCount ?? 0;
      const updatedCount = syncResult?.updated ?? importPreview.updateCount ?? 0;
      showAlert('success', `Import complete: ${createdCount} created, ${updatedCount} updated in database.`);

      // 4. Reset import modal state & close modal
      handleCancelImport();
    } catch (err) {
      console.error("Import submit exception:", err);
      setErrors((prev) => ({ ...prev, import: err.message || "Failed to complete employee sync." }));
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className={`ed-page-container${darkMode ? ' dark' : ''}`}>
      {/* ── TOP ACTION BAR ── */}
      <section className="ed-top-action-bar">
        <div className="ed-header-controls">
          <button className="ed-btn ed-btn-secondary" onClick={handleExport}>
            <Download size={15} />
            <span>Export</span>
          </button>
          <button className="ed-btn ed-btn-secondary" onClick={() => { setIsImportModalOpen(true); setImportFiles([]); setErrors((prev) => ({ ...prev, import: undefined })); }}>
            <FileSpreadsheet size={15} />
            <span>Import Mastersheet</span>
          </button>
          <button className="ed-btn ed-btn-primary" onClick={openAddModal}>
            <Plus size={16} />
            <span>Add Employee</span>
          </button>
        </div>
      </section>

      {/* Alert Notification */}
      {alert && (
        <div className={`ed-alert-banner ${alert.type}`}>
          {alert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* ── 4 SUMMARY STAT CARDS ── */}
      <section className="ed-summary-grid">
        {/* Card 1: Total Employees */}
        <div className="ed-stat-card">
          <div className="ed-stat-head">
            <div className="ed-stat-head-left">
              <div className="ed-stat-icon-badge purple">
                <Users size={16} />
              </div>
              <span className="ed-stat-label">TOTAL<br />EMPLOYEES</span>
            </div>
            <span className="ed-stat-pill purple">Full Roster</span>
          </div>
          <div className="ed-stat-val-wrap">
            <h2 className="ed-stat-val">{stats.total}</h2>
            <span className="ed-stat-unit">Members</span>
          </div>
          <div className="ed-stat-footer">
            <span><strong>{stats.fullTime}</strong> Full-time</span>
            <span className="ed-sub-divider">•</span>
            <span><strong>{stats.interns}</strong> Intern</span>
          </div>
        </div>

        {/* Card 2: Departments */}
        <div className="ed-stat-card">
          <div className="ed-stat-head">
            <div className="ed-stat-head-left">
              <div className="ed-stat-icon-badge teal">
                <Building2 size={16} />
              </div>
              <span className="ed-stat-label">DEPARTMENTS</span>
            </div>
          </div>
          <div className="ed-stat-val-wrap">
            <h2 className="ed-stat-val">{stats.departments}</h2>
            <span className="ed-stat-unit">Divisions</span>
          </div>
          <div className="ed-stat-footer">
            <span><strong>{stats.departments > 0 ? 'All' : 'Unassigned in'}</strong> {stats.departments > 0 ? 'organizations' : 'master sheet'}</span>
          </div>
        </div>

        {/* Card 3: New Hires (YTD) */}
        <div className="ed-stat-card">
          <div className="ed-stat-head">
            <div className="ed-stat-head-left">
              <div className="ed-stat-icon-badge amber">
                <UserPlus size={16} />
              </div>
              <span className="ed-stat-label">NEW HIRES<br />(YTD)</span>
            </div>
            <span className="ed-stat-pill amber">2026 Growth</span>
          </div>
          <div className="ed-stat-val-wrap">
            <h2 className="ed-stat-val">{stats.newHires}</h2>
            <span className="ed-stat-unit">Onboarded</span>
          </div>
          <div className="ed-stat-footer">
            <span><strong>+{stats.growthRate}%</strong> Team expansion</span>
          </div>
        </div>

        {/* Card 4: On Contract */}
        <div className="ed-stat-card">
          <div className="ed-stat-head">
            <div className="ed-stat-head-left">
              <div className="ed-stat-icon-badge blue">
                <Clock size={16} />
              </div>
              <span className="ed-stat-label">ON<br />CONTRACT</span>
            </div>
          </div>
          <div className="ed-stat-val-wrap">
            <h2 className="ed-stat-val">{stats.onContract}</h2>
            <span className="ed-stat-unit">Consultants</span>
          </div>
          <div className="ed-stat-footer">
            <span><strong>External</strong> workforce</span>
          </div>
        </div>
      </section>

      {/* ── MAIN CARD (TOOLBAR + TABLE/GRID + PAGINATION) ── */}
      <section className="ed-main-card">
        {/* Section Toolbar */}
        <div className="ed-toolbar-wrap">
          <div className="ed-toolbar-left">
            <h2 className="ed-section-title">All Employees</h2>
            <span className="ed-count-badge">{filteredEmployees.length} of {employees.length}</span>
          </div>

          {/* Desktop Toolbar Controls (>768px) */}
          <div className="ed-toolbar-right ed-desktop-only">
            {/* Search Box */}
            <div className="ed-search-box">
              <input
                type="text"
                placeholder="Search by name, role, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ed-search-input"
              />
              {search && (
                <button
                  type="button"
                  className="ed-search-clear"
                  onClick={() => setSearch('')}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Department Dropdown */}
            <ProfessionalDropdown
              value={deptFilter}
              onChange={setDeptFilter}
              ariaLabel="Department filter"
              options={deptFilterOptions}
            />

            {/* Sort Dropdown */}
            <ProfessionalDropdown
              value={sortBy}
              onChange={setSortBy}
              ariaLabel="Employee sort"
              options={[
                { value: 'name-asc', label: 'Name (A–Z)' },
                { value: 'name-desc', label: 'Name (Z–A)' },
                { value: 'recent', label: 'Recently Joined' },
                { value: 'tenure', label: 'Longest Tenure' },
              ]}
            />

            {/* View Switcher */}
            <div className="ed-view-switcher">
              <button
                type="button"
                className={`ed-view-btn ${view === 'list' ? 'is-active' : ''}`}
                onClick={() => setView('list')}
                title="List View"
              >
                <List size={14} />
                <span>List</span>
              </button>
              <button
                type="button"
                className={`ed-view-btn ${view === 'grid' ? 'is-active' : ''}`}
                onClick={() => setView('grid')}
                title="Grid View"
              >
                <LayoutGrid size={14} />
                <span>Grid</span>
              </button>
            </div>
          </div>

          {/* Mobile Toolbar Controls (<=768px, matching reference image) */}
          <div className="ed-mobile-toolbar-controls ed-mobile-only">
            {/* Search Row */}
            <div className="ed-mobile-search-row">
              <Search size={16} className="ed-mobile-search-icon" />
              <input
                type="text"
                placeholder="Search by name, role, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ed-mobile-search-input"
              />
              {search && (
                <button
                  type="button"
                  className="ed-mobile-search-clear"
                  onClick={() => setSearch('')}
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Department Dropdown + Filter Button */}
            <div className="ed-mobile-filter-row">
              <div className="ed-mobile-dept-select">
                <CustomSelect
                  value={deptFilter}
                  onChange={setDeptFilter}
                  options={deptFilterOptions}
                  size="md"
                />
              </div>
              <button
                type="button"
                className={`ed-mobile-filter-btn ${isFilterDrawerOpen || typeFilter !== 'all' || sortBy !== 'name-asc' ? 'is-active' : ''}`}
                onClick={() => setIsFilterDrawerOpen((prev) => !prev)}
                title="Filter options"
                aria-label="Filter options"
              >
                <Filter size={18} />
                {(typeFilter !== 'all' || sortBy !== 'name-asc') && (
                  <span className="ed-mobile-filter-dot" />
                )}
              </button>
            </div>

            {/* Quick Filter Drawer (when Filter button clicked) */}
            {isFilterDrawerOpen && (
              <div className="ed-mobile-quick-filter-drawer">
                <div className="ed-qf-header">
                  <span className="ed-qf-title">Filter & Sort</span>
                  <button
                    type="button"
                    className="ed-qf-close"
                    onClick={() => setIsFilterDrawerOpen(false)}
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="ed-qf-row">
                  <label className="ed-qf-label">Sort Order</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="ed-qf-select"
                  >
                    <option value="name-asc">Name (A–Z)</option>
                    <option value="name-desc">Name (Z–A)</option>
                    <option value="recent">Recently Joined</option>
                    <option value="tenure">Longest Tenure</option>
                  </select>
                </div>
                <div className="ed-qf-row">
                  <label className="ed-qf-label">Employment Type</label>
                  <div className="ed-qf-pill-group">
                    {['all', 'Full-time', 'Contract'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`ed-qf-pill ${typeFilter === t ? 'active' : ''}`}
                        onClick={() => setTypeFilter(t)}
                      >
                        {t === 'all' ? 'All Types' : t}
                      </button>
                    ))}
                  </div>
                </div>
                {(typeFilter !== 'all' || sortBy !== 'name-asc' || deptFilter !== 'all' || search) && (
                  <button
                    type="button"
                    className="ed-qf-reset-btn"
                    onClick={() => {
                      setTypeFilter('all');
                      setSortBy('name-asc');
                      setDeptFilter('all');
                      setSearch('');
                      setIsFilterDrawerOpen(false);
                    }}
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            )}

            {/* Segmented List / Grid Toggle */}
            <div className="ed-mobile-view-toggle">
              <button
                type="button"
                className={`ed-mobile-toggle-btn ${view === 'list' ? 'is-active' : ''}`}
                onClick={() => setView('list')}
              >
                <List size={16} />
                <span>List</span>
              </button>
              <button
                type="button"
                className={`ed-mobile-toggle-btn ${view === 'grid' ? 'is-active' : ''}`}
                onClick={() => setView('grid')}
              >
                <LayoutGrid size={16} />
                <span>Grid</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── CONTENT VIEW ── */}
        {filteredEmployees.length === 0 ? (
          <div className="ed-empty-state">
            <div className="ed-empty-icon-wrap">
              <Search size={28} />
            </div>
            <h3 className="ed-empty-title">No employees found</h3>
            <p className="ed-empty-desc">
              We couldn't find any team members matching your search or filters. Try resetting the filters.
            </p>
          </div>
        ) : view === 'list' ? (
          <>
            {/* Desktop Table (Hidden on <=768px) */}
            <div className="ed-table-wrap ed-desktop-table ed-desktop-only">
              <table className="ed-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Contact</th>
                    <th>Location</th>
                    <th>Joined</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((emp) => (
                    <tr
                      key={emp.id}
                      tabIndex={0}
                      onClick={() => openProfile(emp)}
                      onKeyDown={(e) => handleActivateKey(e, () => openProfile(emp))}
                    >
                      <td>
                        <div className="ed-person-cell">
                          <EmployeeAvatar employee={emp} size={36} />
                          <div className="ed-person-info">
                            <span className="ed-person-name">{getEmployeeDisplayName(emp)}</span>
                            <span className="ed-person-role">{emp.designation || emp.role || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`ed-dept-pill tone-${toneFor(cleanDepartment(emp.department))}`}>
                          {cleanDepartment(emp.department)}
                        </span>
                      </td>
                      <td>
                        <div className="ed-contact-cell">
                          <a
                            href={`mailto:${emp.email}`}
                            className="ed-contact-email"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {emp.email}
                          </a>
                          <span className="ed-contact-phone">{emp.phone}</span>
                        </div>
                      </td>
                      <td>
                        <div className="ed-location-cell">
                          <MapPin size={13} />
                          <span>{formatLocation(emp.location)}</span>
                        </div>
                      </td>
                      <td>
                        <span className="ed-date-cell">{formatDate(emp.joined)}</span>
                      </td>
                      <td>
                        <span className={`ed-type-pill ${emp.type === 'Contract' ? 'contract' : 'full-time'}`}>
                          {emp.type}
                        </span>
                      </td>
                      <td>
                        <div className="ed-actions-cell" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="ed-action-btn docs"
                            onClick={() => setRepositoryEmployee(emp)}
                            aria-label={`Open documents for ${emp.name}`}
                            title="Employee Documents"
                          >
                            <FolderOpen size={19} />
                          </button>
                          <button
                            type="button"
                            className="ed-action-btn edit"
                            onClick={() => openEditModal(emp)}
                            aria-label={`Edit ${emp.name}`}
                            title="Edit Employee"
                          >
                            <Pencil size={19} />
                          </button>
                          <button
                            type="button"
                            className="ed-action-btn delete"
                            onClick={(e) => handleDelete(emp, e)}
                            aria-label={`Remove ${emp.name}`}
                            title="Remove Employee"
                          >
                            <Trash2 size={19} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Employee Cards (Shown on <=768px, readable full cards with actions) */}
            <div className="ed-mobile-list-cards ed-mobile-only">
              {pageItems.map((emp) => {
                const formattedLoc = formatLocation(emp.location);
                const empCode = emp.emp_code || emp.id || '—';
                return (
                  <div
                    key={emp.id}
                    className="ed-mob-row-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => openProfile(emp)}
                    onKeyDown={(e) => handleActivateKey(e, () => openProfile(emp))}
                  >
                    <div className="ed-mob-card-main">
                      <EmployeeAvatar employee={emp} size={46} />
                      <div className="ed-mob-card-content">
                        <div className="ed-mob-card-top-row">
                          <span className="ed-mob-row-name" title={getEmployeeDisplayName(emp)}>
                            {getEmployeeDisplayName(emp)}
                          </span>
                          <span className="ed-card-id-badge" title="Employee ID">
                            {empCode}
                          </span>
                        </div>
                        <span className="ed-mob-row-role">{emp.designation || emp.role || '—'}</span>
                        <div className="ed-mob-card-tags">
                          <span className={`ed-dept-pill tone-${toneFor(cleanDepartment(emp.department))}`}>
                            {cleanDepartment(emp.department)}
                          </span>
                          <span className={`ed-type-pill ${emp.type === 'Contract' ? 'contract' : 'full-time'}`}>
                            {emp.type || 'Full-time'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="ed-mob-card-meta">
                      <div className="ed-mob-meta-item location" title={formattedLoc}>
                        <MapPin size={12} className="ed-card-info-icon" />
                        <span>{formattedLoc}</span>
                      </div>
                      <div className="ed-mob-meta-item email" title={emp.email}>
                        <Mail size={12} className="ed-card-info-icon" />
                        <span className="ed-card-email-wrap">{emp.email || '—'}</span>
                      </div>
                      <div className="ed-mob-meta-item phone" title={emp.phone || emp.mobile || '+91 99999 99999'}>
                        <Phone size={12} className="ed-card-info-icon" />
                        <span>{emp.phone || emp.mobile || '+91 99999 99999'}</span>
                      </div>
                    </div>

                    <div className="ed-mob-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="ed-card-btn-docs"
                        onClick={() => setRepositoryEmployee(emp)}
                        title={`Documents for ${emp.name}`}
                      >
                        <FolderOpen size={14} />
                        <span>Documents</span>
                      </button>
                      <button
                        type="button"
                        className="ed-action-btn edit"
                        onClick={() => openEditModal(emp)}
                        title="Edit Employee"
                        aria-label={`Edit ${emp.name}`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="ed-action-btn delete"
                        onClick={(e) => handleDelete(emp, e)}
                        title="Remove Employee"
                        aria-label={`Remove ${emp.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* ── UNIFIED RESPONSIVE GRID VIEW (All 9 Required Fields, No Text Overlap) ── */
          <div className="ed-grid-wrap">
            {pageItems.map((emp) => {
              const formattedLoc = formatLocation(emp.location);
              const empCode = emp.emp_code || emp.id || '—';
              return (
                <div
                  key={emp.id}
                  className="ed-grid-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => openProfile(emp)}
                  onKeyDown={(e) => handleActivateKey(e, () => openProfile(emp))}
                >
                  {/* 1 & 2 & 3 & 4: Avatar, Full Name, Designation, Employee ID */}
                  <div className="ed-card-header">
                    <EmployeeAvatar employee={emp} size={48} className="ed-card-avatar" />
                    <div className="ed-card-identity">
                      <div className="ed-card-name-row">
                        <h4 className="ed-card-name" title={getEmployeeDisplayName(emp)}>
                          {getEmployeeDisplayName(emp)}
                        </h4>
                        <span className="ed-card-id-badge" title="Employee ID">
                          {empCode}
                        </span>
                      </div>
                      <span className="ed-card-designation">{emp.designation || emp.role || 'Employee'}</span>
                    </div>
                  </div>

                  {/* 5: Department Badge & Type Pill */}
                  <div className="ed-card-badges-row">
                    <span className={`ed-dept-pill tone-${toneFor(cleanDepartment(emp.department))}`}>
                      {cleanDepartment(emp.department)}
                    </span>
                    <span className={`ed-type-pill ${emp.type === 'Contract' ? 'contract' : 'full-time'}`}>
                      {emp.type || 'Full-time'}
                    </span>
                  </div>

                  {/* 6 & 7 & 8: Location, Email Address, Contact Number */}
                  <div className="ed-card-info-list">
                    <div className="ed-card-info-item location" title={formattedLoc}>
                      <MapPin size={13} className="ed-card-info-icon" />
                      <span className="ed-card-info-text">{formattedLoc}</span>
                    </div>
                    <div className="ed-card-info-item email" title={emp.email}>
                      <Mail size={13} className="ed-card-info-icon" />
                      <span className="ed-card-info-text ed-card-email-wrap">{emp.email || '—'}</span>
                    </div>
                    <div className="ed-card-info-item phone" title={emp.phone || emp.mobile || '+91 99999 99999'}>
                      <Phone size={13} className="ed-card-info-icon" />
                      <span className="ed-card-info-text">{emp.phone || emp.mobile || '+91 99999 99999'}</span>
                    </div>
                  </div>

                  {/* 9: Documents and Supported Actions */}
                  <div className="ed-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="ed-card-btn-docs"
                      onClick={() => setRepositoryEmployee(emp)}
                      title={`Open documents for ${emp.name}`}
                    >
                      <FolderOpen size={14} />
                      <span>Documents</span>
                    </button>
                    <button
                      type="button"
                      className="ed-action-btn edit"
                      onClick={() => openEditModal(emp)}
                      title="Edit Employee"
                      aria-label={`Edit ${emp.name}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="ed-action-btn delete"
                      onClick={(e) => handleDelete(emp, e)}
                      title="Remove Employee"
                      aria-label={`Remove ${emp.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PAGINATION FOOTER ── */}
        {filteredEmployees.length > 0 && (
          <div className="ed-pagination-wrap">
            <span className="ed-pagination-info">
              Showing <strong>{rangeStart}</strong>–<strong>{rangeEnd}</strong> of <strong>{filteredEmployees.length}</strong> employees
            </span>
            <div className="ed-pagination-btns">
              <button
                type="button"
                className="ed-page-btn"
                disabled={safePage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={15} />
              </button>
              {pageNumbers.map((n, i) =>
                n === '...' ? (
                  <span key={`gap-${i}`} className="ed-page-gap">…</span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    className={`ed-page-btn ${n === safePage ? 'is-active' : ''}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                )
              )}
              <button
                type="button"
                className="ed-page-btn"
                disabled={safePage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── ADD / EDIT EMPLOYEE MODAL (PORTALED TO BODY FOR ACCESSIBLE SCROLLING & FIXED FOOTER) ── */}
      {isModalOpen && createPortal(
        <div className="ed-modal-backdrop" onClick={handleOverlayClick}>
          <div className="ed-modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ed-modal-header">
              <div className="ed-modal-header-copy">
                <h3 className="ed-modal-title">{modalMode === 'add' ? 'Add New Employee' : 'Edit Employee Profile'}</h3>
                <p className="ed-modal-sub">Fill in the employee credentials and organizational details below.</p>
              </div>
              <button className="ed-modal-close" onClick={closeModal} aria-label="Close modal" disabled={isSubmitting}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="ed-modal-body">
                {modalServerError && (
                  <div className="ed-alert-banner error" style={{ margin: '0 0 6px 0' }}>
                    <AlertCircle size={16} />
                    <span>{modalServerError}</span>
                  </div>
                )}

                {/* BASIC INFORMATION */}
                <div className="ed-form-section">
                  <span className="ed-form-section-title">Basic Information</span>
                  <div className="ed-form-grid-2">
                    <div className="ed-form-group">
                      <label htmlFor="ed-emp-code">Employee ID *</label>
                      <input
                        id="ed-emp-code"
                        type="text"
                        className={`ed-form-input ${errors.emp_code ? 'has-error' : ''}`}
                        placeholder="e.g. LE724"
                        value={formData.emp_code}
                        onChange={(e) => updateField('emp_code', e.target.value)}
                        disabled={isSubmitting || modalMode === 'edit'}
                      />
                      {errors.emp_code && <span className="ed-field-err">{errors.emp_code}</span>}
                    </div>
                    <div className="ed-form-group">
                      <label htmlFor="ed-name">Full Name *</label>
                      <input
                        id="ed-name"
                        type="text"
                        className={`ed-form-input ${errors.name ? 'has-error' : ''}`}
                        placeholder="e.g. Jordan Lee"
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.name && <span className="ed-field-err">{errors.name}</span>}
                    </div>
                  </div>

                  <div className="ed-form-grid-2">
                    <div className="ed-form-group">
                      <label htmlFor="ed-email">Work Email *</label>
                      <input
                        id="ed-email"
                        type="email"
                        className={`ed-form-input ${errors.email ? 'has-error' : ''}`}
                        placeholder="name@company.com"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.email && <span className="ed-field-err">{errors.email}</span>}
                    </div>
                    <div className="ed-form-group">
                      <label htmlFor="ed-phone">Phone Number</label>
                      <input
                        id="ed-phone"
                        type="tel"
                        className="ed-form-input"
                        placeholder="+1 (555) 000-0000"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                <hr className="ed-form-section-divider" />

                {/* ORGANISATION */}
                <div className="ed-form-section">
                  <span className="ed-form-section-title">Organisation</span>
                  <div className="ed-form-grid-2">
                    <div className="ed-form-group">
                      <label htmlFor="ed-role">Role / Title *</label>
                      <input
                        id="ed-role"
                        type="text"
                        className={`ed-form-input ${errors.role ? 'has-error' : ''}`}
                        placeholder="e.g. Senior Designer"
                        value={formData.role}
                        onChange={(e) => updateField('role', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.role && <span className="ed-field-err">{errors.role}</span>}
                    </div>
                    <div className="ed-form-group">
                      <label htmlFor="ed-department">Department *</label>
                      <CustomSelect
                        id="ed-department"
                        placeholder="Select department"
                        hasError={Boolean(errors.department)}
                        value={formData.department}
                        onChange={(val) => updateField('department', val)}
                        disabled={isSubmitting}
                        options={availableDepartments.map((d) => ({ value: d, label: d }))}
                      />
                      {errors.department && <span className="ed-field-err">{errors.department}</span>}
                    </div>
                  </div>

                  <div className="ed-form-grid-2">
                    <div className="ed-form-group">
                      <label htmlFor="ed-type">Employment Type</label>
                      <CustomSelect
                        id="ed-type"
                        value={formData.type}
                        onChange={(val) => updateField('type', val)}
                        disabled={isSubmitting}
                        options={[
                          { value: 'Full-time', label: 'Full-time' },
                          { value: 'Part-time', label: 'Part-time' },
                          { value: 'Contract', label: 'Contract' },
                          { value: 'Intern', label: 'Intern' },
                        ]}
                      />
                    </div>
                    <div className="ed-form-group">
                      <label htmlFor="ed-location">Location</label>
                      <input
                        id="ed-location"
                        type="text"
                        className="ed-form-input"
                        placeholder="City, Country or Remote"
                        value={formData.location}
                        onChange={(e) => updateField('location', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                <hr className="ed-form-section-divider" />

                {/* EMPLOYMENT */}
                <div className="ed-form-section">
                  <span className="ed-form-section-title">Employment & Compensation</span>
                  <div className="ed-form-grid">
                    <div className="ed-form-group">
                      <label htmlFor="ed-joined">Joining Date</label>
                      <CustomDatePicker
                        id="ed-joined"
                        value={formData.joined}
                        onChange={(dateStr) => updateField('joined', dateStr)}
                        placeholder="Select joining date..."
                        disabled={isSubmitting}
                      />
                    </div>
                    {modalMode === 'add' && (
                      <div className="ed-form-group">
                        <label htmlFor="ed-salary">Monthly Gross Salary (₹, Optional)</label>
                        <input
                          id="ed-salary"
                          type="number"
                          className="ed-form-input"
                          placeholder="e.g. 50000 (leave blank for setup required)"
                          value={formData.monthly_gross || ''}
                          onChange={(e) => updateField('monthly_gross', e.target.value)}
                          disabled={isSubmitting}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--ed-text-muted)' }}>
                          Leave blank to initialize as &apos;Payroll Setup Required&apos;.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <hr className="ed-form-section-divider" />

                {/* ADDITIONAL INFORMATION */}
                <div className="ed-form-section">
                  <span className="ed-form-section-title">Additional Information</span>
                  <div className="ed-form-group">
                    <label htmlFor="ed-about">About / Bio</label>
                    <textarea
                      id="ed-about"
                      className="ed-form-textarea"
                      placeholder="Brief description of their responsibilities and expertise…"
                      value={formData.about}
                      onChange={(e) => updateField('about', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div className="ed-modal-footer">
                {modalMode === 'edit' && (
                  <button
                    type="button"
                    className="ed-btn ed-btn-secondary"
                    style={{ color: 'var(--ed-rose)', marginRight: 'auto', borderColor: 'rgba(225,29,72,0.3)' }}
                    onClick={handleDeleteFromModal}
                    disabled={isSubmitting}
                  >
                    Remove Employee
                  </button>
                )}
                <button type="button" className="ed-btn ed-btn-secondary" onClick={closeModal} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="ed-btn ed-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <LoaderCircle size={15} className="ed-spin" />
                      <span>{modalMode === 'add' ? 'Adding...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <span>{modalMode === 'add' ? 'Add Employee' : 'Save Changes'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── IMPORT MODAL (PORTALED TO BODY TO PREVENT SIDEBAR OVERLAY/CROPPING) ── */}
      {isImportModalOpen && createPortal(
        <div className="ed-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) handleCancelImport(); }}>
          <div className="ed-modal-card import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ed-modal-header">
              <div className="ed-modal-header-copy">
                <h3 className="ed-modal-title">Import Employees from Mastersheets</h3>
                <p className="ed-modal-sub">Upload one or multiple Excel (.xlsx, .xls) or CSV sheets for bulk employee master sync, automatic role assignment & manager structure.</p>
              </div>
              <button className="ed-modal-close" onClick={handleCancelImport} aria-label="Close modal">
                <X size={16} />
              </button>
            </div>

            <div className="ed-modal-body">
              {errors.import && (
                <div className="ed-form-error ed-import-error" style={{ margin: '0 0 14px 0', padding: '10px 14px', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={15} />
                  <span>{errors.import}</span>
                </div>
              )}
              {!importPreview ? (
                <>
                  <div 
                    className={`ed-import-dropzone ${importDragOver ? 'drag-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setImportDragOver(true); }}
                    onDragLeave={() => setImportDragOver(false)}
                    onDrop={handleImportFileDrop}
                  >
                    <UploadCloud size={36} className="ed-import-drop-icon" />
                    <strong>Click to select or drag & drop multiple Excel / CSV sheets</strong>
                    <span>Supports multiple files (.xlsx, .xls, .csv) and multi-tab workbooks</span>
                    <input 
                      type="file" 
                      multiple 
                      accept=".xlsx,.xls,.csv" 
                      onChange={handleImportFileSelect} 
                      className="ed-import-file-input" 
                    />
                  </div>

                  {importFiles.length > 0 && (
                    <div className="ed-import-files-container">
                      <div className="ed-import-files-header">
                        <span>Selected Sheets ({importFiles.length})</span>
                        <button type="button" className="ed-import-clear-btn" onClick={() => { setImportFiles([]); setImportPreview(null); }}>
                          Clear All
                        </button>
                      </div>
                      <div className="ed-import-files-list">
                        {importFiles.map((file, idx) => (
                          <div key={`${file.name}-${idx}`} className="ed-import-file-item">
                            <div className="ed-import-file-left">
                              <div className="ed-import-file-badge">
                                <FileSpreadsheet size={18} />
                              </div>
                              <div className="ed-import-file-meta">
                                <span className="ed-import-file-name" title={file.name}>{file.name}</span>
                                <span className="ed-import-file-size">{formatFileSize(file.size)}</span>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              className="ed-import-remove-item" 
                              onClick={() => removeImportFile(idx)} 
                              title="Remove sheet"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="ed-import-preview-wrap">
                  <div className="ed-preview-table-wrap">
                    <table className="ed-preview-table">
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>Emp Code</th>
                          <th>Full Name</th>
                          <th>Email</th>
                          <th>Department</th>
                          <th>Designation / Role</th>
                          <th>Manager</th>
                          <th>Contact Number</th>
                          <th>Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.parsedEmployees.map((emp, i) => (
                          <tr key={emp.emp_code || i}>
                            <td>
                              <span className={`ed-action-badge ${emp.isUpdate ? 'update' : 'create'}`}>
                                {emp.isUpdate ? 'UPDATE' : 'CREATE'}
                              </span>
                            </td>
                            <td><strong>{emp.emp_code}</strong></td>
                            <td>{emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || '—'}</td>
                            <td>{emp.email || '—'}</td>
                            <td>{emp.department || 'General'}</td>
                            <td>{emp.role || emp.designation || 'Employee'}</td>
                            <td>{emp.reporting_supervisor || '—'}</td>
                            <td>{emp.phone || '—'}</td>
                            <td>{emp.location || 'Mumbai, IN'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {errors.import && (
                <div className="ed-form-error ed-import-error">
                  <AlertCircle size={14} /> {errors.import}
                </div>
              )}
            </div>
            
            <div className="ed-modal-footer">
              <button 
                type="button" 
                id="ed-import-cancel-btn"
                className="ed-btn ed-btn-cancel" 
                onClick={handleCancelImport}
                disabled={isImporting}
              >
                Cancel
              </button>

              {importPreview ? (
                <>
                  <button 
                    type="button" 
                    id="ed-import-back-btn"
                    className="ed-btn ed-btn-outline" 
                    onClick={() => setImportPreview(null)}
                    disabled={isImporting}
                  >
                    Back to Select Files
                  </button>
                  <button 
                    type="button" 
                    id="ed-import-submit-btn"
                    className="ed-btn ed-btn-primary" 
                    onClick={handleImportSubmit} 
                    disabled={isImporting}
                  >
                    {isImporting ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <LoaderCircle size={16} className="ed-spin" />
                        <span>Syncing {importPreview.totalRows} Employees...</span>
                      </span>
                    ) : (
                      `Confirm & Sync ${importPreview.totalRows} Employees`
                    )}
                  </button>
                </>
              ) : (
                <button 
                  type="button" 
                  id="ed-import-preview-btn"
                  className="ed-btn ed-btn-primary" 
                  onClick={() => generateImportPreview(importFiles)} 
                  disabled={!importFiles.length || isParsingPreview}
                >
                  {isParsingPreview ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <LoaderCircle size={16} className="ed-spin" />
                      <span>Parsing & Validating...</span>
                    </span>
                  ) : (
                    `Preview & Validate ${importFiles.length > 0 ? `${importFiles.length} Sheet${importFiles.length > 1 ? 's' : ''}` : ''}`
                  )}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── REPOSITORY MODAL (DOCUMENTS) ── */}
      {repositoryEmployee && (
        <RepositoryModal
          employee={repositoryEmployee}
          darkMode={darkMode}
          onClose={() => setRepositoryEmployee(null)}
        />
      )}
    </div>
  );
}