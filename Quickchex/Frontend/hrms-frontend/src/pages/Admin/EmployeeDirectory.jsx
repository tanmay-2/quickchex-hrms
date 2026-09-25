import { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Plus, Download, Search, List, LayoutGrid,
  Users, Building2, UserPlus, Clock, CheckCircle2, AlertCircle, X,
  Trash2, ChevronLeft, ChevronRight, MapPin, Pencil,
  ChevronDown, Check, FolderOpen, UploadCloud, FileText, FileSpreadsheet, FileImage, Eye,
  Trash2 as TrashIcon, Download as DownloadIcon, LoaderCircle
} from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { DashboardShell, DashboardShellContext } from "../../components/header/DashboardHeader";
import { useTheme } from "../../theme/ThemeProvider";
import CustomSelect from "../../components/ui/CustomSelect";
import { getEmployeeDisplayName, getInitials } from "../../utils/employeeDisplay";
import { loadUnifiedEmployees, getStoredEmployees, saveStoredEmployees } from "../../utils/employeeStore";
import "./EmployeeDirectory.css";

/* ---------- constants & mock data ---------- */

const DEPARTMENTS = ['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'Finance'];
const TONES = ['a', 'b', 'c', 'd', 'e', 'f'];
const PAGE_SIZE = 8;

const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
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
};

/* ---------- helpers ---------- */

function toneFor(department) {
  const idx = DEPARTMENTS.indexOf(department);
  return TONES[idx >= 0 ? idx % TONES.length : 0];
}

function parseISODate(str) {
  if (!str) return new Date(0);
  const parts = str.split('-').map(Number);
  if (parts.length < 3) return new Date(0);
  const [y, m, d] = parts;
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDate(str) {
  if (!str) return '—';
  const date = parseISODate(str);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

/* ---------- Repository Modal (Documents) ---------- */

function RepositoryModal({ employee, onClose, darkMode }) {
  const [documents, setDocuments] = useState({});
  const [activeCategory, setActiveCategory] = useState(DOC_CATEGORIES[0].key);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const token = localStorage.getItem('token');

  const loadDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/profile/employees/${employee.id}/documents/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error((await res.text()) || `Unable to load documents (${res.status})`);
      const data = await res.json();
      const grouped = {};
      DOC_CATEGORIES.forEach((cat) => { grouped[cat.key] = []; });
      (Array.isArray(data) ? data : []).forEach((doc) => {
        const cat = doc.category || 'other_documents';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(doc);
      });
      setDocuments(grouped);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load employee documents.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadDocuments(); }, [employee.id]);

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length || uploading) return;
    const allowed = new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','image/gif','image/webp']);
    const invalid = files.find((file) => file.size > 10 * 1024 * 1024 || (!allowed.has(file.type) && !/\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|gif|webp)$/i.test(file.name)));
    if (invalid) { setError(`Unsupported file or size limit exceeded: ${invalid.name}`); return; }
    setUploading(true); setError('');
    try {
      const form = new FormData();
      files.forEach((file) => form.append('files', file));
      form.append('category', activeCategory);
      const res = await fetch(`${API_BASE}/profile/employees/${employee.id}/documents/upload/`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
      if (!res.ok) throw new Error((await res.text()) || `Upload failed (${res.status})`);
      await loadDocuments();
    } catch (err) { console.error(err); setError(err.message || 'Upload failed.'); }
    finally { setUploading(false); }
  };

  const deleteDocument = async (docId) => {
    if (deleteId !== docId) return;
    try {
      setError('');
      const res = await fetch(`${API_BASE}/profile/employees/${employee.id}/documents/${docId}/`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error((await res.text()) || `Delete failed (${res.status})`);
      setDeleteId(null); await loadDocuments();
    } catch (err) { console.error(err); setError(err.message || 'Delete failed.'); }
  };

  const activeDocs = documents[activeCategory] || [];
  const activeCat = DOC_CATEGORIES.find((cat) => cat.key === activeCategory) || DOC_CATEGORIES[0];
  const totalDocs = Object.values(documents).reduce((sum, list) => sum + list.length, 0);

  return (
    <div className="repo-overlay" onClick={onClose}>
      <div className={`repo-modal ${darkMode ? 'repo-dark' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="repo-header">
          <div className="repo-header-title">
            <div className="repo-header-icon"><FolderOpen size={18} /></div>
            <div>
              <h2>Employee Repository</h2>
              <p>{employee.name} · {totalDocs} document{totalDocs === 1 ? '' : 's'}</p>
            </div>
          </div>
          <button className="repo-close" onClick={onClose} aria-label="Close repository"><X size={18} /></button>
        </div>
        <div className="repo-body">
          <aside className="repo-sidebar">
            <div className="repo-sidebar-heading">DOCUMENT CATEGORIES</div>
            {DOC_CATEGORIES.map((cat) => {
              const count = (documents[cat.key] || []).length;
              const active = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  className={`repo-category ${active ? 'active' : ''}`}
                  style={active ? { background: cat.bg, color: cat.color, borderColor: `${cat.color}55` } : undefined}
                  onClick={() => { setActiveCategory(cat.key); setDeleteId(null); setError(''); }}
                >
                  <span className="repo-category-name">
                    <span className="repo-category-dot" style={{ background: cat.color }} />
                    {cat.label}
                  </span>
                  <span className="repo-count" style={active ? { background: cat.color, color: '#fff' } : undefined}>{count}</span>
                </button>
              );
            })}
          </aside>
          <main className="repo-main">
            <div className="repo-main-top">
              <div>
                <div className="repo-eyebrow">SELECTED CATEGORY</div>
                <h3 style={{ color: activeCat.color }}>{activeCat.label}</h3>
                <p>{activeDocs.length} file{activeDocs.length === 1 ? '' : 's'} in this category</p>
              </div>
              <label
                className={`repo-upload ${uploading ? 'disabled' : ''}`}
                title={uploading ? 'Uploading files…' : 'Upload files'}
              >
                <UploadCloud size={16} />
                <span>{uploading ? 'Uploading…' : 'Upload Files'}</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={(e) => {
                    if (!uploading) uploadFiles(e.target.files);
                    e.target.value = '';
                  }}
                  disabled={uploading}
                  aria-label="Upload files"
                />
              </label>
            </div>
            {error && (
              <div className="repo-error">
                <AlertCircle size={15} />
                <span>{error}</span>
                <button onClick={() => setError('')}><X size={13} /></button>
              </div>
            )}
            <div
              className={`repo-dropzone ${dragOver ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
            >
              <div className="repo-drop-icon"><UploadCloud size={24} /></div>
              <strong>Drag & drop files here</strong>
              <span>or click <b>Upload Files</b> to browse your computer</span>
              <small>PDF, Word, Excel and image files · Maximum 10 MB per file</small>
            </div>
            <div className="repo-list-head">
              <span>Uploaded Files</span>
              <span>{activeDocs.length}</span>
            </div>
            <div className="repo-doc-list">
              {loading ? (
                <div className="repo-state">
                  <LoaderCircle className="repo-spinner" size={24} />
                  <span>Loading documents…</span>
                </div>
              ) : activeDocs.length ? (
                activeDocs.map((doc) => {
                  const fileName = doc.file_name || doc.original_name || doc.filename || 'Unnamed file';
                  const url = docUrl(doc.file_url || doc.url || doc.path);
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
                        <a className="repo-action view" href={url} target="_blank" rel="noopener noreferrer" title="View">
                          <Eye size={15} />
                        </a>
                        <a className="repo-action download" href={url} download title="Download">
                          <DownloadIcon size={15} />
                        </a>
                        {confirming ? (
                          <div className="repo-confirm">
                            <span>Delete?</span>
                            <button className="repo-action confirm" onClick={() => deleteDocument(doc.id)} title="Confirm delete">
                              <CheckCircle2 size={15} />
                            </button>
                            <button className="repo-action cancel" onClick={() => setDeleteId(null)} title="Cancel">
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <button className="repo-action delete" onClick={() => setDeleteId(doc.id)} title="Delete">
                            <TrashIcon size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="repo-state empty">
                  <FolderOpen size={36} />
                  <strong>No documents in {activeCat.label}</strong>
                  <span>Upload files above or drag them into the drop zone.</span>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
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
  const [page, setPage] = useState(1);
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);
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
      if (Array.isArray(loaded) && loaded.length > 0) {
        setEmployees(loaded);
      } else {
        const stored = getStoredEmployees();
        if (stored.length > 0) setEmployees(stored);
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
    if (!alert) return undefined;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  useEffect(() => {
    setPage(1);
  }, [search, deptFilter, sortBy, view]);

  const filteredEmployees = useMemo(() => {
    const term = (search || '').trim().toLowerCase();
    let list = (employees || []).filter((emp) => {
      const matchesSearch =
        !term ||
        (emp.name || '').toLowerCase().includes(term) ||
        (emp.role || '').toLowerCase().includes(term) ||
        (emp.email || '').toLowerCase().includes(term);
      const matchesDept = deptFilter === 'all' || emp.department === deptFilter;
      return matchesSearch && matchesDept;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'recent') return parseISODate(b.joined) - parseISODate(a.joined);
      if (sortBy === 'tenure') return parseISODate(a.joined) - parseISODate(b.joined);
      return 0;
    });
    return list;
  }, [employees, search, deptFilter, sortBy]);

  const stats = useMemo(() => {
    const total = employees.length;
    const departments = new Set(employees.map((e) => e.department)).size;
    const currentYear = new Date().getFullYear();
    const newHires = employees.filter((e) => parseISODate(e.joined).getFullYear() === currentYear).length;
    const onContract = employees.filter((e) => e.type === 'Contract').length;
    return { total, departments, newHires, onContract };
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
    setFormData({ ...EMPTY_FORM, emp_code: `LE${Math.floor(100 + Math.random() * 900)}`, joined: todayISO() });
    setErrors({});
    setIsModalOpen(true);
  }

  function openProfile(emp) {
    const targetId = emp.emp_code || emp.id || emp.employeeId;
    navigate(`/dashboard/employees/${encodeURIComponent(targetId)}`, { state: { employee: emp } });
  }

  function openEditModal(emp) {
    setModalMode('edit');
    setEditingId(emp.id);
    const cleanDisplayName = getEmployeeDisplayName(emp);
    const modalName = (emp.name && emp.email && emp.name.trim().toLowerCase() === emp.email.trim().toLowerCase()) ? '' : (emp.name || '');
    setFormData({
      emp_code: emp.emp_code || emp.id || '',
      name: modalName,
      role: emp.role || emp.designation || '',
      email: emp.email || '',
      phone: emp.phone || '',
      department: emp.department || '',
      type: emp.type || 'Full-time',
      location: emp.location || '',
      joined: emp.joined || todayISO(),
      about: emp.about || '',
    });
    setErrors({});
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  function handleOverlayClick(e) {
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
  }

  function validate(data) {
    const errs = {};
    if (!data.emp_code || !data.emp_code.trim()) errs.emp_code = 'Employee Code is required.';
    if (!data.role || !data.role.trim()) errs.role = 'Role is required.';
    if (!data.email || !data.email.trim()) {
      errs.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errs.email = 'Enter a valid email address.';
    }
    if (!data.department) errs.department = 'Select a department.';
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(formData);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const cleanCode = formData.emp_code.trim();
    const displayName = formData.name ? formData.name.trim() : null;
    const parts = (formData.name || '').trim().split(' ').filter(Boolean);
    const first = parts[0] || null;
    const last = parts.length > 1 ? parts.slice(1).join(' ') : null;

    if (modalMode === 'add') {
      const newEmployee = {
        id: cleanCode,
        name: displayName,
        ...formData,
        emp_code: cleanCode,
        joined: formData.joined || todayISO()
      };
      setEmployees((prev) => [newEmployee, ...prev]);
      showAlert('success', `Employee ${cleanCode} added to directory.`);
      (async () => {
        try {
          await fetch(`${API_BASE}/add-emp/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emp_code: cleanCode,
              first_name: first,
              last_name: last,
              password: 'Admin@123',
              email: formData.email,
              mobile: formData.phone || '9999999999',
              role: (formData.role || 'employee').toLowerCase(),
              department: formData.department || 'General',
              designation: formData.designation || formData.role || 'Employee',
              joining_date: formData.joined || todayISO()
            })
          });
          loadEmployeesFromDb();
        } catch (err) {
          console.warn('Backend save error:', err);
        }
      })();
    } else {
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === editingId
            ? {
                ...emp,
                emp_code: cleanCode,
                name: displayName,
                role: formData.role,
                email: formData.email,
                phone: formData.phone,
                department: formData.department,
                type: formData.type,
                location: formData.location,
                joined: formData.joined,
                about: formData.about,
              }
            : emp
        )
      );
      showAlert('success', `Employee profile ${cleanCode} updated.`);
      (async () => {
        try {
          await fetch(`${API_BASE}/profile/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emp_code: cleanCode,
              first_name: first,
              last_name: last,
              email: formData.email,
              mobile: formData.phone,
              role: (formData.role || 'employee').toLowerCase(),
              designation: formData.role,
              department: formData.department,
              location: formData.location,
            }),
          }).catch(() => {});
          loadEmployeesFromDb();
        } catch (err) {
          console.warn('Backend update error:', err);
        }
      })();
    }
    setIsModalOpen(false);
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
  let role = getVal(['designation', 'role', 'jobtitle', 'position', 'title', 'post', 'roletitle', 'occupation', 'worktype', 'job']);
  if (!role) role = 'Employee';

  // 6. Department
  let dept = getVal(['department', 'dept', 'division', 'section', 'team', 'group', 'unit', 'branch']);
  if (!dept) {
    const roleLower = String(role).toLowerCase();
    if (roleLower.includes('developer') || roleLower.includes('software') || roleLower.includes('tech') || roleLower.includes('engineer')) {
      dept = 'Development';
    } else if (roleLower.includes('design') || roleLower.includes('ui') || roleLower.includes('ux')) {
      dept = 'Design';
    } else if (roleLower.includes('hr') || roleLower.includes('human') || roleLower.includes('talent')) {
      dept = 'HR';
    } else if (roleLower.includes('sales') || roleLower.includes('marketing') || roleLower.includes('business')) {
      dept = 'Sales';
    } else if (roleLower.includes('finance') || roleLower.includes('account')) {
      dept = 'Finance';
    } else {
      dept = 'Operations';
    }
  }

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
      const d = new Date(rawJoined.trim());
      if (!isNaN(d.getTime())) joined = d.toISOString().split('T')[0];
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
  let supervisor = getVal(['reportingmanager', 'manager', 'reports_to', 'reportsto', 'managername', 'reportinghead', 'head', 'rm']);

  return {
    id: cleanCode,
    emp_code: cleanCode,
    first_name: resolvedFirst,
    middle_name: resolvedMiddle,
    last_name: resolvedLast,
    name: resolvedName,
    role,
    designation: role,
    department: dept,
    email: resolvedEmail,
    phone: cleanPhone,
    location: loc,
    type,
    joined: String(joined),
    about: '',
    salary,
    reporting_supervisor: supervisor || null,
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
        emp_code: String(emp.emp_code || '').trim(),
        name: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || null,
        first_name: emp.first_name || null,
        last_name: emp.last_name || null,
        email: emp.email || `${String(emp.emp_code || '').toLowerCase()}@laesfera.co`,
        mobile_no: emp.phone || emp.mobile_no || '9999999999',
        role: emp.role || emp.designation || 'Employee',
        designation: emp.designation || emp.role || 'Employee',
        department: emp.department || 'General',
        location: emp.location || 'Mumbai, IN',
        manager: emp.reporting_supervisor || emp.manager || null,
        manager_code: emp.reporting_supervisor || emp.manager_code || null,
        joining_date: emp.joined || todayISO(),
        employment_type: emp.type || emp.employment_type || 'Full-time',
      }));

      // 1. Multi-endpoint sync attempt to FastAPI Backend
      let apiSuccess = false;
      let createdCnt = importPreview.newCount || 0;
      let updatedCnt = importPreview.updateCount || 0;

      const tryEndpoints = [
        `${API_BASE}/api/v1/admin/employees/import-mastersheet`,
        `${API_BASE}/admin/employees/import-mastersheet`,
        `/api/v1/admin/employees/import-mastersheet`
      ];

      for (const endpoint of tryEndpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employees: formattedItems }),
          });

          if (res.ok) {
            const result = await res.json();
            if (result.created !== undefined) createdCnt = result.created;
            if (result.updated !== undefined) updatedCnt = result.updated;
            apiSuccess = true;
            break;
          }
        } catch (fetchErr) {
          console.warn(`Endpoint ${endpoint} failed:`, fetchErr);
        }
      }

      // Fallback: If bulk endpoint missed, call individual add-emp
      if (!apiSuccess) {
        for (const emp of formattedItems) {
          try {
            await fetch(`${API_BASE}/add-emp/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                emp_code: emp.emp_code,
                first_name: emp.first_name,
                middle_name: null,
                last_name: emp.last_name,
                password: 'Admin@123',
                email: emp.email,
                mobile: emp.mobile_no || '9999999999',
                role: (emp.role || 'employee').toLowerCase(),
                department: emp.department || 'General',
                designation: emp.designation || emp.role || 'Employee',
                joining_date: emp.joining_date || todayISO(),
                salary: null,
                reporting_supervisor: emp.manager || emp.manager_code || null,
              }),
            });
          } catch (e) {
            console.warn("Fallback add-emp notice:", e);
          }
        }
      }

      // 2. Instant Local State Update (Guarantees directory table updates immediately!)
      setEmployees((prev) => {
        const prevMap = new Map();
        prev.forEach((e) => {
          const k = String(e.emp_code || e.id).toLowerCase().trim();
          prevMap.set(k, e);
        });

        itemsToSync.forEach((newEmp) => {
          const k = String(newEmp.emp_code || newEmp.id).toLowerCase().trim();
          const cleanName = newEmp.name || `${newEmp.first_name || ''} ${newEmp.last_name || ''}`.trim() || newEmp.emp_code;
          const email = newEmp.email || `${k}@laesfera.co`;

          if (prevMap.has(k)) {
            const existing = prevMap.get(k);
            prevMap.set(k, {
              ...existing,
              name: cleanName,
              email: email,
              department: newEmp.department || existing.department,
              role: newEmp.role || existing.role,
              designation: newEmp.designation || existing.designation || newEmp.role,
              phone: newEmp.phone || existing.phone,
              location: newEmp.location || existing.location,
              reporting_supervisor: newEmp.reporting_supervisor || existing.reporting_supervisor,
            });
          } else {
            prevMap.set(k, {
              id: newEmp.emp_code,
              emp_code: newEmp.emp_code,
              name: cleanName,
              role: newEmp.role || 'Employee',
              designation: newEmp.designation || newEmp.role || 'Employee',
              department: newEmp.department || 'General',
              email: email,
              phone: newEmp.phone || '+91 99999 99999',
              location: newEmp.location || 'Mumbai, IN',
              type: newEmp.type || 'Full-time',
              joined: newEmp.joined || todayISO(),
              about: '',
              profile_image: '',
              reporting_supervisor: newEmp.reporting_supervisor || null,
            });
          }
        });

        const finalList = Array.from(prevMap.values());
        saveStoredEmployees(finalList);
        return finalList;
      });

      showAlert('success', `${itemsToSync.length} employees imported successfully.`);

      // 3. Reset import modal state & close modal
      handleCancelImport();

      // 4. Background reload from DB
      loadEmployeesFromDb().catch(() => {});
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
              <span className="ed-stat-label">Total Employees</span>
            </div>
            <span className="ed-stat-pill purple">Full Roster</span>
          </div>
          <div className="ed-stat-val-wrap">
            <h2 className="ed-stat-val">{stats.total}</h2>
            <span className="ed-stat-unit">Members</span>
          </div>
          <div className="ed-stat-footer">
            <span><strong>{stats.total - stats.onContract}</strong> Full-time</span>
            <span className="ed-sub-divider">•</span>
            <span><strong>{stats.onContract}</strong> Contract</span>
          </div>
        </div>

        {/* Card 2: Departments */}
        <div className="ed-stat-card">
          <div className="ed-stat-head">
            <div className="ed-stat-head-left">
              <div className="ed-stat-icon-badge teal">
                <Building2 size={16} />
              </div>
              <span className="ed-stat-label">Departments</span>
            </div>
            <span className="ed-stat-pill teal">Active</span>
          </div>
          <div className="ed-stat-val-wrap">
            <h2 className="ed-stat-val">{stats.departments}</h2>
            <span className="ed-stat-unit">Divisions</span>
          </div>
          <div className="ed-stat-footer">
            <span><strong>All</strong> organizational units active</span>
          </div>
        </div>

        {/* Card 3: New Hires (YTD) */}
        <div className="ed-stat-card">
          <div className="ed-stat-head">
            <div className="ed-stat-head-left">
              <div className="ed-stat-icon-badge amber">
                <UserPlus size={16} />
              </div>
              <span className="ed-stat-label">New Hires (YTD)</span>
            </div>
            <span className="ed-stat-pill amber">2026 Growth</span>
          </div>
          <div className="ed-stat-val-wrap">
            <h2 className="ed-stat-val">{stats.newHires}</h2>
            <span className="ed-stat-unit">Onboarded</span>
          </div>
          <div className="ed-stat-footer">
            <span><strong>+{((stats.newHires / stats.total) * 100).toFixed(0)}%</strong> Team expansion</span>
          </div>
        </div>

        {/* Card 4: On Contract */}
        <div className="ed-stat-card">
          <div className="ed-stat-head">
            <div className="ed-stat-head-left">
              <div className="ed-stat-icon-badge blue">
                <Clock size={16} />
              </div>
              <span className="ed-stat-label">On Contract</span>
            </div>
            <span className="ed-stat-pill blue">Contractors</span>
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

          <div className="ed-toolbar-right">
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
              options={[
                { value: 'all', label: 'All Departments' },
                ...DEPARTMENTS.map((d) => ({ value: d, label: d })),
              ]}
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
          <div className="ed-table-wrap">
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
                        <div className={`ed-avatar-circle tone-${toneFor(emp.department)}`}>
                          {getInitials(emp.name, emp.email)}
                        </div>
                        <div className="ed-person-info">
                          <span className="ed-person-name">{getEmployeeDisplayName(emp)}</span>
                          <span className="ed-person-role">{emp.role}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`ed-dept-pill tone-${toneFor(emp.department)}`}>
                        {emp.department}
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
                        <span>{emp.location}</span>
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
                          <FolderOpen size={15} />
                        </button>
                        <button
                          type="button"
                          className="ed-action-btn edit"
                          onClick={() => openEditModal(emp)}
                          aria-label={`Edit ${emp.name}`}
                          title="Edit Employee"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="ed-action-btn delete"
                          onClick={(e) => handleDelete(emp, e)}
                          aria-label={`Remove ${emp.name}`}
                          title="Remove Employee"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ed-grid-wrap">
            {pageItems.map((emp) => (
              <div
                key={emp.id}
                className="ed-grid-card"
                role="button"
                tabIndex={0}
                onClick={() => openProfile(emp)}
                onKeyDown={(e) => handleActivateKey(e, () => openProfile(emp))}
              >
                <div className={`ed-grid-avatar tone-${toneFor(emp.department)}`}>
                  {getInitials(emp.name, emp.email)}
                </div>
                <h4 className="ed-grid-name">{getEmployeeDisplayName(emp)}</h4>
                <span className="ed-grid-role">{emp.role}</span>
                <span className={`ed-dept-pill tone-${toneFor(emp.department)}`}>
                  {emp.department}
                </span>

                <div className="ed-grid-meta">
                  <span>{emp.email}</span>
                  <span>{emp.location} · Joined {formatDate(emp.joined)}</span>
                </div>

                <div className="ed-grid-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="ed-grid-btn"
                    onClick={() => setRepositoryEmployee(emp)}
                    title={`Open documents for ${emp.name}`}
                  >
                    <FolderOpen size={13} />
                    <span>Documents</span>
                  </button>
                  <button
                    type="button"
                    className="ed-action-btn edit"
                    onClick={() => openEditModal(emp)}
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="ed-action-btn delete"
                    onClick={(e) => handleDelete(emp, e)}
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
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

      {/* ── ADD / EDIT EMPLOYEE MODAL ── */}
      {isModalOpen && (
        <div className="ed-modal-backdrop" onClick={handleOverlayClick}>
          <div className="ed-modal-card">
            <div className="ed-modal-header">
              <div className="ed-modal-header-copy">
                <h3 className="ed-modal-title">{modalMode === 'add' ? 'Add New Employee' : 'Edit Employee Profile'}</h3>
                <p className="ed-modal-sub">Fill in the employee credentials and organizational details below.</p>
              </div>
              <button className="ed-modal-close" onClick={closeModal} aria-label="Close modal">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="ed-modal-body">
                <div className="ed-form-grid-2">
                  <div className="ed-form-group">
                    <label htmlFor="ed-emp-code">Emp Code / Employee ID *</label>
                    <input
                      id="ed-emp-code"
                      type="text"
                      className={`ed-form-input ${errors.emp_code ? 'has-error' : ''}`}
                      placeholder="e.g. LE001"
                      value={formData.emp_code}
                      onChange={(e) => updateField('emp_code', e.target.value)}
                    />
                    {errors.emp_code && <span className="ed-field-err">{errors.emp_code}</span>}
                  </div>
                  <div className="ed-form-group">
                    <label htmlFor="ed-name">Full Name</label>
                    <input
                      id="ed-name"
                      type="text"
                      className={`ed-form-input ${errors.name ? 'has-error' : ''}`}
                      placeholder="e.g. Jordan Lee"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                    />
                    {errors.name && <span className="ed-field-err">{errors.name}</span>}
                  </div>
                </div>

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
                    />
                    {errors.role && <span className="ed-field-err">{errors.role}</span>}
                  </div>
                  <div className="ed-form-group">
                    <label htmlFor="ed-email">Work Email *</label>
                    <input
                      id="ed-email"
                      type="email"
                      className={`ed-form-input ${errors.email ? 'has-error' : ''}`}
                      placeholder="name@company.com"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
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
                    />
                  </div>
                </div>

                <div className="ed-form-grid-2">
                  <div className="ed-form-group">
                    <label htmlFor="ed-department">Department *</label>
                    <CustomSelect
                      id="ed-department"
                      placeholder="Select department"
                      hasError={Boolean(errors.department)}
                      value={formData.department}
                      onChange={(val) => updateField('department', val)}
                      options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
                    />
                    {errors.department && <span className="ed-field-err">{errors.department}</span>}
                  </div>
                  <div className="ed-form-group">
                    <label htmlFor="ed-type">Employment Type</label>
                    <CustomSelect
                      id="ed-type"
                      value={formData.type}
                      onChange={(val) => updateField('type', val)}
                      options={[
                        { value: 'Full-time', label: 'Full-time' },
                        { value: 'Contract', label: 'Contract' },
                      ]}
                    />
                  </div>
                </div>

                <div className="ed-form-grid-2">
                  <div className="ed-form-group">
                    <label htmlFor="ed-location">Location</label>
                    <input
                      id="ed-location"
                      type="text"
                      className="ed-form-input"
                      placeholder="City, Country or Remote"
                      value={formData.location}
                      onChange={(e) => updateField('location', e.target.value)}
                    />
                  </div>
                  <div className="ed-form-group">
                    <label htmlFor="ed-joined">Joining Date</label>
                    <input
                      id="ed-joined"
                      type="date"
                      className="ed-form-input"
                      value={formData.joined}
                      onChange={(e) => updateField('joined', e.target.value)}
                    />
                  </div>
                </div>

                <div className="ed-form-group">
                  <label htmlFor="ed-about">About / Bio</label>
                  <textarea
                    id="ed-about"
                    className="ed-form-textarea"
                    placeholder="Brief description of their responsibilities and expertise…"
                    value={formData.about}
                    onChange={(e) => updateField('about', e.target.value)}
                  />
                </div>
              </div>

              <div className="ed-modal-footer">
                {modalMode === 'edit' && (
                  <button
                    type="button"
                    className="ed-btn ed-btn-secondary"
                    style={{ color: 'var(--ed-rose)', marginRight: 'auto', borderColor: 'rgba(225,29,72,0.3)' }}
                    onClick={handleDeleteFromModal}
                  >
                    Remove Employee
                  </button>
                )}
                <button type="button" className="ed-btn ed-btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="ed-btn ed-btn-primary">
                  {modalMode === 'add' ? 'Add Employee' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
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
                    className="ed-btn ed-btn-outline" 
                    onClick={() => setImportPreview(null)}
                    disabled={isImporting}
                  >
                    Back to Select Files
                  </button>
                  <button 
                    type="button" 
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