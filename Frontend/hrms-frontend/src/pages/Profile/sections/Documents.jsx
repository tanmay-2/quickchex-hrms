import React, { useState, useEffect, useRef } from "react";
import {
  PiCaretDownBold,
  PiEyeDuotone,
  PiTrashDuotone,
  PiDownloadSimpleDuotone,
  PiUploadSimpleBold,
  PiFilePdfDuotone,
  PiFileImageDuotone,
  PiFileDocDuotone,
  PiFileDuotone,
  PiXBold,
  PiCheckCircleDuotone,
  PiFolderSimpleDashedDuotone,
} from "react-icons/pi";
import { getApiUrl, getApiBaseUrl } from "../../../services/apiClient";
import { getCleanImageUrl } from "../components/ProfileSidebar";
import "./documents.css";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTS = [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx", ".xls", ".xlsx"];

function Documents({ formData = {}, setToast = () => {} }) {
  const empCode = formData.emp_code || localStorage.getItem("emp_code") || "ADM001";

  const [openDoc, setOpenDoc] = useState(true);
  const [openLetters, setOpenLetters] = useState(false);

  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [comment, setComment] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  // Letters (HR issuance)
  const [letterFiles, setLetterFiles] = useState(() => {
    try {
      const saved = localStorage.getItem(`employee_letters_${empCode}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch real employee documents from the backend
  const fetchDocuments = async () => {
    if (!empCode) return;
    setLoadingDocs(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("authToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      let res = await fetch(getApiUrl(`/api/v1/documents/${empCode}`), { headers });
      if (!res.ok) {
        res = await fetch(getApiUrl(`/documents/${empCode}`), { headers });
      }

      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        setDocs(list);
      } else {
        // Fallback to local storage if endpoint returned empty or non-200
        const local = localStorage.getItem(`employee_docs_${empCode}`);
        setDocs(local ? JSON.parse(local) : []);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
      const local = localStorage.getItem(`employee_docs_${empCode}`);
      setDocs(local ? JSON.parse(local) : []);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [empCode]);

  // Handle file picker selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File size exceeds 10MB limit.");
      return;
    }

    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      setUploadError(`Unsupported file format (${ext}). Allowed: PDF, PNG, JPG, DOC, XLS.`);
      return;
    }

    setSelectedFile(file);
    setUploadError("");
    if (!fileName) {
      setFileName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  // Upload document
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please select a file to upload.");
      return;
    }
    if (!fileName.trim()) {
      setUploadError("Please enter a file name.");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("authToken");
      const uploadForm = new FormData();
      uploadForm.append("file", selectedFile);
      uploadForm.append("emp_code", empCode);
      uploadForm.append("file_name", fileName.trim());
      if (comment.trim()) {
        uploadForm.append("comment", comment.trim());
      }

      let res = await fetch(getApiUrl("/api/v1/documents/upload"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: uploadForm,
      });

      if (!res.ok) {
        res = await fetch(getApiUrl("/documents/upload"), {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: uploadForm,
        });
      }

      if (res.ok) {
        setToast({ show: true, message: "Document uploaded successfully!", type: "success" });
        setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
        setShowModal(false);
        resetModal();
        await fetchDocuments();
      } else {
        // Local fallback so user work is never lost
        const fallbackDoc = {
          id: Date.now(),
          emp_code: empCode,
          file_name: fileName.trim(),
          file_location: URL.createObjectURL(selectedFile),
          created_at: new Date().toISOString(),
        };
        const updated = [fallbackDoc, ...docs];
        setDocs(updated);
        try {
          localStorage.setItem(`employee_docs_${empCode}`, JSON.stringify(updated));
        } catch {}

        setToast({ show: true, message: "Document saved locally.", type: "success" });
        setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
        setShowModal(false);
        resetModal();
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError("Failed to upload document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setFileName("");
    setComment("");
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Delete document
  const handleDelete = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("authToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(getApiUrl(`/api/v1/documents/${docId}`), {
        method: "DELETE",
        headers,
      });

      if (res.ok || res.status === 404) {
        setDocs((prev) => prev.filter((d) => d.id !== docId));
        setToast({ show: true, message: "Document deleted.", type: "success" });
        setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
      }
    } catch {
      // Local removal
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    }
  };

  const getDocIcon = (name = "") => {
    const ext = name.split(".").pop().toLowerCase();
    if (ext === "pdf") return <PiFilePdfDuotone size={18} color="#dc2626" />;
    if (["jpg", "jpeg", "png", "webp"].includes(ext)) return <PiFileImageDuotone size={18} color="#2563eb" />;
    if (["doc", "docx"].includes(ext)) return <PiFileDocDuotone size={18} color="#4f46e5" />;
    return <PiFileDuotone size={18} color="#6b7280" />;
  };

  return (
    <div className="card documents-card">
      {/* HEADER ACTION */}
      <div className="documents-header">
        <div>
          <h4>Employee Document Repository</h4>
          <p className="documents-subtitle">Manage personal and employment compliance documents.</p>
        </div>
        <button
          type="button"
          className="upload-btn"
          onClick={() => {
            resetModal();
            setShowModal(true);
          }}
        >
          <PiUploadSimpleBold size={15} />
          <span>Upload Document</span>
        </button>
      </div>

      {/* 1. EMPLOYEE DOCUMENTS DROPDOWN */}
      <div className="dropdown">
        <div
          className="dropdown-header"
          onClick={() => {
            setOpenDoc(!openDoc);
            setOpenLetters(false);
          }}
          role="button"
          tabIndex={0}
        >
          <span className="dropdown-title">
            <span className="dropdown-badge">{docs.length}</span>
            <span>Employee Documents</span>
          </span>
          <PiCaretDownBold className={`arrow ${openDoc ? "rotate" : ""}`} />
        </div>

        {openDoc && (
          <div className="dropdown-body">
            {loadingDocs ? (
              <div className="docs-loading-state">Loading documents…</div>
            ) : docs.length === 0 ? (
              <div className="docs-empty-state">
                <PiFolderSimpleDashedDuotone size={36} className="docs-empty-icon" />
                <p>No employee documents uploaded yet.</p>
                <button
                  type="button"
                  className="docs-empty-action"
                  onClick={() => setShowModal(true)}
                >
                  Click here to upload
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th style={{ width: "90px", textAlign: "center" }}>View</th>
                      <th style={{ width: "100px", textAlign: "center" }}>Download</th>
                      <th style={{ width: "90px", textAlign: "center" }}>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((file) => {
                      const fileUrl = getCleanImageUrl(file.file_location);
                      return (
                        <tr key={file.id}>
                          <td>
                            <div className="doc-file-info">
                              {getDocIcon(file.file_name)}
                              <span className="doc-file-name" title={file.file_name}>
                                {file.file_name}
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {fileUrl ? (
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="icon-center icon view"
                                title="View document"
                              >
                                <PiEyeDuotone size={18} />
                              </a>
                            ) : (
                              <span className="icon-disabled">—</span>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {fileUrl ? (
                              <a
                                href={fileUrl}
                                download={file.file_name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="icon-center icon download"
                                title="Download document"
                              >
                                <PiDownloadSimpleDuotone size={18} />
                              </a>
                            ) : (
                              <span className="icon-disabled">—</span>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleDelete(file.id)}
                              className="icon-center icon delete"
                              title="Delete document"
                            >
                              <PiTrashDuotone size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. EMPLOYEE LETTERS DROPDOWN */}
      <div className="dropdown">
        <div
          className="dropdown-header"
          onClick={() => {
            setOpenLetters(!openLetters);
            setOpenDoc(false);
          }}
          role="button"
          tabIndex={0}
        >
          <span className="dropdown-title">
            <span className="dropdown-badge">{letterFiles.length}</span>
            <span>Letters</span>
          </span>
          <PiCaretDownBold className={`arrow ${openLetters ? "rotate" : ""}`} />
        </div>

        {openLetters && (
          <div className="dropdown-body">
            {letterFiles.length === 0 ? (
              <div className="docs-empty-state">
                <PiFolderSimpleDashedDuotone size={36} className="docs-empty-icon" />
                <p>No employee letters issued yet.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th style={{ width: "90px", textAlign: "center" }}>View</th>
                      <th style={{ width: "100px", textAlign: "center" }}>Download</th>
                      <th style={{ width: "90px", textAlign: "center" }}>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {letterFiles.map((file) => (
                      <tr key={file.id}>
                        <td>
                          <div className="doc-file-info">
                            {getDocIcon(file.name)}
                            <span className="doc-file-name">{file.name}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button type="button" className="icon-center icon view" title="View letter">
                            <PiEyeDuotone size={18} />
                          </button>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button type="button" className="icon-center icon download" title="Download letter">
                            <PiDownloadSimpleDuotone size={18} />
                          </button>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button type="button" className="icon-center icon delete" title="Delete letter">
                            <PiTrashDuotone size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          PROFESSIONAL UPLOAD MODAL
          ══════════════════════════════════════════ */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !uploading && setShowModal(false)}>
          <div className="custom-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            {/* CLEAN MODAL HEADER */}
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Upload Document</h3>
                <p className="modal-subtitle">Add a PDF, image, or document to employee records.</p>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => !uploading && setShowModal(false)}
                aria-label="Close modal"
                disabled={uploading}
              >
                <PiXBold size={17} />
              </button>
            </div>

            {/* FORM BODY */}
            <form onSubmit={handleUpload}>
              <div className="modal-body">
                {uploadError && <div className="modal-error-alert">{uploadError}</div>}

                {/* File Name */}
                <div className="form-group">
                  <label htmlFor="doc-file-name">
                    Document Title / File Name <span className="req">*</span>
                  </label>
                  <input
                    id="doc-file-name"
                    type="text"
                    placeholder="e.g. Identity Proof / PAN Card"
                    value={fileName}
                    onChange={(e) => {
                      setFileName(e.target.value);
                      if (uploadError) setUploadError("");
                    }}
                    required
                    disabled={uploading}
                  />
                </div>

                {/* Select File */}
                <div className="form-group">
                  <label>
                    Select File <span className="req">*</span>
                  </label>
                  <div
                    className={`custom-file-picker ${selectedFile ? "has-file" : ""}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                      disabled={uploading}
                    />
                    <div className="custom-file-picker-inner">
                      <PiUploadSimpleBold size={24} className="picker-icon" />
                      {selectedFile ? (
                        <div className="picker-file-selected">
                          <span className="picker-file-name">{selectedFile.name}</span>
                          <span className="picker-file-size">
                            ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                      ) : (
                        <div className="picker-placeholder">
                          <span className="picker-main-text">Choose a file or drag here</span>
                          <span className="picker-sub-text">PDF, PNG, JPG, DOC up to 10MB</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Comment */}
                <div className="form-group">
                  <label htmlFor="doc-comment">Comment / Notes (Optional)</label>
                  <textarea
                    id="doc-comment"
                    placeholder="Enter any additional remarks or details..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={uploading}
                    rows={3}
                  />
                </div>
              </div>

              {/* FOOTER */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn cancel"
                  onClick={() => setShowModal(false)}
                  disabled={uploading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn submit"
                  disabled={uploading || !selectedFile || !fileName.trim()}
                >
                  {uploading ? "Uploading…" : "Upload Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Documents;