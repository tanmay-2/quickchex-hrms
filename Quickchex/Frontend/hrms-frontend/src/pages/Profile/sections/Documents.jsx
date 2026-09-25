import { useState } from "react";
import {
  PiCaretDownBold,
  PiEyeDuotone,
  PiTrashDuotone,
  PiDownloadSimpleDuotone,
} from "react-icons/pi";
import "./documents.css";

function Documents() {
  const [openDoc, setOpenDoc] = useState(true);
  const [openLetters, setOpenLetters] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const [files, setFiles] = useState(() => {
    try {
      const saved = localStorage.getItem("employee_documents");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleUpload = () => {
    if (!selectedFile) return alert("Please select a file");
    const newDoc = {
      id: Date.now(),
      name: selectedFile.name,
      uploadedAt: new Date().toLocaleDateString(),
    };
    const updated = [newDoc, ...files];
    setFiles(updated);
    try {
      localStorage.setItem("employee_documents", JSON.stringify(updated));
    } catch {}
    setShowModal(false);
    setSelectedFile(null);
  };

  const handleDelete = (id) => {
    const updated = files.filter((f) => f.id !== id);
    setFiles(updated);
    try {
      localStorage.setItem("employee_documents", JSON.stringify(updated));
    } catch {}
  };

  return (
    <div className="card documents-card">

      {/* HEADER */}
      <div className="documents-header">
        <button className="upload-btn" onClick={() => setShowModal(true)}>
          + Upload
        </button>
      </div>

      {/* Employee Documents */}
      <div className="dropdown">
        <div
          className="dropdown-header"
          onClick={() => {
            setOpenDoc(!openDoc);
            setOpenLetters(false);
          }}
        >
          <span>📄 Employee Documents</span>
          <PiCaretDownBold className={`arrow ${openDoc ? "rotate" : ""}`} />
        </div>

        {openDoc && (
          <div className="dropdown-body">
            {files.length === 0 ? (
              <p style={{ padding: "16px", color: "var(--muted)", textAlign: "center", fontSize: "13px" }}>
                No employee documents uploaded yet. Click + Upload to add your documents.
              </p>
            ) : (
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>View</th>
                    <th>Download</th>
                    <th>Delete</th>
                  </tr>
                </thead>

                {/* ✅ FIXED ICON ALIGNMENT */}
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id}>
                      <td>{file.name}</td>

                      <td>
                        <div className="icon-center">
                          <PiEyeDuotone className="icon view" />
                        </div>
                      </td>

                      <td>
                        <div className="icon-center">
                          <PiDownloadSimpleDuotone className="icon download" />
                        </div>
                      </td>

                      <td>
                        <div className="icon-center" onClick={() => handleDelete(file.id)} style={{ cursor: "pointer" }}>
                          <PiTrashDuotone className="icon delete" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Employee Letters */}
      <div className="dropdown">
        <div
          className="dropdown-header"
          onClick={() => {
            setOpenLetters(!openLetters);
            setOpenDoc(false);
          }}
        >
          <span>📑 Employee Letters</span>
          <PiCaretDownBold className={`arrow ${openLetters ? "rotate" : ""}`} />
        </div>

        {openLetters && (
          <div className="dropdown-body">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>View</th>
                  <th>Download</th>
                  <th>Delete</th>
                </tr>
              </thead>

              {/* ✅ SAME FIX HERE */}
              <tbody>
                {dummyFiles.map((file) => (
                  <tr key={file.id}>
                    <td>{file.name}</td>

                    <td>
                      <div className="icon-center">
                        <PiEyeDuotone className="icon view" />
                      </div>
                    </td>

                    <td>
                      <div className="icon-center">
                        <PiDownloadSimpleDuotone className="icon download" />
                      </div>
                    </td>

                    <td>
                      <div className="icon-center">
                        <PiTrashDuotone className="icon delete" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="custom-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="modal-header">
              <h3>Upload Document</h3>
              <span
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ✕
              </span>
            </div>

            {/* BODY */}
            <div className="modal-body">

              <div className="form-group">
                <label>File Name</label>
                <input type="text" placeholder="Enter file name" />
              </div>

              <div className="form-group">
                <label>Select File</label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                />
              </div>

              <div className="form-group">
                <label>Comment</label>
                <textarea placeholder="Enter comment"></textarea>
              </div>

            </div>

            {/* FOOTER */}
            <div className="modal-footer">
              <button
                className="btn cancel"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>

              <button className="btn submit" onClick={handleUpload}>
                Submit
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default Documents;