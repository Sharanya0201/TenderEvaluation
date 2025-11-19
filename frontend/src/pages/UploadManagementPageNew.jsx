import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext";
import "../styles/UploadManagementNew.css";

const API_BASE_URL =
  (import.meta.env && import.meta.env.VITE_API_BASE) || "http://localhost:8000";
const API_BASE = `${API_BASE_URL}/api/v1`;

// Upload Modal Component
const UploadModal = ({ selectedId, docType, onUpload, onCancel, loading }) => {
  // file may be a single File (tender) or an array of Files (vendor folder)
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const fileInputRef = React.useRef();

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (!files) return;
    if (docType === "vendor") {
      // store as array so we can append each file with its relative path
      setFile(Array.from(files));
    } else {
      setFile(files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file || (Array.isArray(file) && file.length === 0)) {
      alert("Please select a file or folder");
      return;
    }
    if (docType === "tender" && !title) {
      alert("Please enter document title");
      return;
    }
    onUpload(file, title);
  };

  return (
    <div className="um-modal-overlay" onClick={onCancel}>
      <div className="um-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="um-modal-header">
          <h2>Upload New {docType === "tender" ? "Tender" : "Vendor"} Document</h2>
          <button
            className="um-modal-close"
            onClick={onCancel}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="um-form">
          {docType === "tender" && (
            <div className="um-form-group">
              <label htmlFor="title">Document Title *</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title..."
                disabled={loading}
                required
              />
            </div>
          )}

          <div className="um-file-upload-area">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="um-file-input"
              disabled={loading}
              accept=".pdf,.xlsx,.xls,.docx,.pptx,.txt,.png,.jpg,.jpeg,.tiff,.bmp,.gif"
              {...(docType === "vendor" ? { webkitdirectory: "", directory: "", multiple: true } : {})}
            />
            <div
              className="um-file-upload-box"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="um-file-upload-icon">📤</div>
              <p>
                {file
                  ? Array.isArray(file)
                    ? `Selected: ${file.length} file(s)`
                    : `Selected: ${file.name}`
                  : "Click or drag file to select"}
              </p>
              <small>Supported: PDF, Excel, Word, PowerPoint, Images, Text</small>
            </div>
          </div>

          <div className="um-modal-footer">
            <button
              type="button"
              onClick={onCancel}
              className="um-btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="um-btn-primary"
              disabled={loading || !file}
            >
              {loading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Confirmation Dialog
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="um-modal-overlay" onClick={onCancel}>
    <div className="um-modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="um-modal-header">
        <h2>Confirm Delete</h2>
        <button className="um-modal-close" onClick={onCancel}>✕</button>
      </div>
      <p className="um-confirm-message">{message}</p>
      <div className="um-modal-footer">
        <button onClick={onCancel} className="um-btn-secondary">Cancel</button>
        <button onClick={onConfirm} className="um-btn-danger">Delete</button>
      </div>
    </div>
  </div>
);

// Document Card Component
const DocumentCard = ({ doc, docType, onDelete, onView }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <div className="um-doc-card">
      <div className="um-doc-header">
        <div className="um-doc-title">{doc.title || doc.filename}</div>
        <div className="um-doc-meta">
          <span className="um-doc-extraction">
            {doc.form_data?.extraction_method || "Unknown"}
          </span>
          <span className={`um-doc-status um-status-${doc.status?.toLowerCase()}`}>
            {doc.status}
          </span>
        </div>
      </div>
      <div className="um-doc-details">
        <div className="um-doc-row">
          <span className="um-doc-label">File:</span>
          <span className="um-doc-value">{doc.filename}</span>
        </div>
        <div className="um-doc-row">
          <span className="um-doc-label">Uploaded:</span>
          <span className="um-doc-value">{formatDate(doc.createddate)}</span>
        </div>
        <div className="um-doc-row">
          <span className="um-doc-label">By:</span>
          <span className="um-doc-value">{doc.uploadedby}</span>
        </div>
        {docType === "vendor" && (
          <div className="um-doc-row">
            <span className="um-doc-label">Type:</span>
            <span className="um-doc-value">Vendor Document</span>
          </div>
        )}
      </div>
      <div className="um-doc-actions">
        <button className="um-doc-btn um-doc-btn-view" onClick={onView}>
          👁️ View
        </button>
        <button className="um-doc-btn um-doc-btn-delete" onClick={onDelete}>
          🗑️ Delete
        </button>
      </div>
    </div>
  );
};

// Main Component
export default function UploadManagementPage() {
  const { currentUser } = useAuth();
  const { isCollapsed } = useSidebar();

  // States
  const [tenders, setTenders] = useState([]);
  const [selectedTender, setSelectedTender] = useState(null);
  const [tenderDocs, setTenderDocs] = useState([]);
  const [vendorDocs, setVendorDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [uploadModal, setUploadModal] = useState({ isOpen: false, type: null });
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, data: null, type: null });
  const [uploadLoading, setUploadLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadTendersAndVendors();
  }, []);

  const loadTendersAndVendors = async () => {
    try {
      setLoading(true);
      // Fetch list of tenders from tenders table for dropdown
      const tendersRes = await fetch(`${API_BASE}/uploads/tenders/list?limit=1000`);
      const tendersData = await tendersRes.json();

      if (tendersData.success) {
        setTenders(tendersData.data || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Handle tender selection
  const handleTenderSelect = async (tenderid) => {
    setSelectedTender(tenderid ? parseInt(tenderid) : null);
    if (tenderid) {
      const tid = parseInt(tenderid);
      
      // Fetch tender attachments for this tender
      try {
        const tendersRes = await fetch(`${API_BASE}/uploads/tenders?tenderid=${tid}&limit=1000`);
        const tendersData = await tendersRes.json();
        if (tendersData.success) {
          setTenderDocs(tendersData.tenders || []);
        }
      } catch (error) {
        console.error("Error loading tender documents:", error);
        setTenderDocs([]);
      }
      
      // Fetch vendor documents for this tender
      try {
        const vendorsRes = await fetch(`${API_BASE}/uploads/vendors?tenderid=${tid}&limit=1000`);
        const vendorsData = await vendorsRes.json();
        if (vendorsData.success) {
          setVendorDocs(vendorsData.vendors || []);
        }
      } catch (error) {
        console.error("Error loading vendor documents:", error);
        setVendorDocs([]);
      }
    } else {
      setTenderDocs([]);
      setVendorDocs([]);
    }
  };

  // Get tender by ID
  const getSelectedTenderData = () => tenders.find((t) => t.tenderid === selectedTender);

  // Upload handler
  const handleUploadFile = async (file, title) => {
    setUploadLoading(true);
    try {
      const fd = new FormData();
      fd.append("uploadedby", currentUser?.username || "user");

      if (uploadModal.docType === "tender") {
        fd.append("tenderid", selectedTender);
        fd.append("title", title);
        fd.append("file", file);

        const res = await fetch(`${API_BASE}/upload/tender`, {
          method: "POST",
          body: fd,
        });

        if (res.ok) {
          const data = await res.json();
          setTenderDocs((prev) => [...prev, data.tender]);
          setUploadModal({ isOpen: false, docType: null });
          alert("Tender document uploaded successfully!");
        } else {
          const err = await res.json();
          alert(`Upload failed: ${err.detail || err.message}`);
        }
      } else {
        fd.append("tenderid", selectedTender);

        // file may be an array (directory) or a single File; append each preserving relative path
        if (Array.isArray(file)) {
          file.forEach((f) => {
            fd.append("files", f, f.webkitRelativePath || f.name);
          });
        } else {
          fd.append("files", file, file.webkitRelativePath || file.name);
        }

        const res = await fetch(`${API_BASE}/upload/vendors`, {
          method: "POST",
          body: fd,
        });

        if (res.ok) {
          const data = await res.json();
          // refresh vendor/tender docs for selected tender
          await handleTenderSelect(selectedTender);
          setUploadModal({ isOpen: false, docType: null });
          alert(`✓ Successfully uploaded ${data?.saved?.length || 0} vendor file(s)`);
        } else {
          const err = await res.json().catch(() => ({}));
          alert(`Upload failed: ${err.detail || err.message || res.statusText}`);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploadLoading(false);
    }
  };

  // Delete handler
  const handleDelete = async (doc, docType) => {
    setConfirmDelete({ isOpen: false, data: null, docType: null });
    try {
      const url =
        docType === "tender"
          ? `${API_BASE}/uploads/tender/${doc.tenderid}`
          : `${API_BASE}/uploads/vendor/${doc.vendorid}`;

      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();

      if (res.ok && data.success) {
        if (docType === "tender") {
          setTenderDocs((prev) => prev.filter((t) => t.tenderid !== doc.tenderid));
        } else {
          setVendorDocs((prev) => prev.filter((v) => v.vendorid !== doc.vendorid));
        }
        alert("Document deleted successfully!");
      } else {
        alert(`Delete failed: ${data.detail || data.message}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Delete failed. Please try again.");
    }
  };

  // View/Download document
  const handleView = (doc, docType) => {
    if (!doc.tenderid && !doc.vendorid) {
      alert("Document ID not available");
      return;
    }

    try {
      // Use the backend download endpoint to get the file
      const attachmentId = docType === "tender" ? doc.tenderid : doc.vendorid;
      const downloadUrl = `${API_BASE}/downloads/${docType}/${attachmentId}`;
      
      // Create a link element to download the file
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = doc.filename || "document";
      link.target = "_blank";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error viewing document:", error);
      alert("Failed to view document. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="um-container">
   
        <div className={`um-main-content ${isCollapsed ? "um-collapsed" : ""}`}>
          <div className="um-loading">Loading...</div>
        </div>
      </div>
    );
  }

  const selectedTenderData = getSelectedTenderData();

  return (
    <div className="um-container">

      <div className={`um-main-content ${isCollapsed ? "um-collapsed" : ""}`}>
        {/* Header */}
        <div className="um-header">
          <h1>Upload Management</h1>
          <p>Select a tender to view and manage all related documents</p>
        </div>

        {/* Content */}
        <div className="um-content">
          {/* Tender Selector */}
          <div className="um-selector-section">
            <label htmlFor="tender-select">Select Tender:</label>
            <select
              id="tender-select"
              value={selectedTender || ""}
              onChange={(e) => handleTenderSelect(e.target.value)}
              className="um-selector"
            >
              <option value="">-- Choose a tender --</option>
              {tenders.map((tender) => (
                <option key={tender.tenderid} value={tender.tenderid}>
                  Tender #{tender.tenderid} - {tender.title}
                </option>
              ))}
            </select>
          </div>

          {selectedTender ? (
            <>
              {/* Tender Documents Section */}
              <div className="um-section-header">
                <h2>📄 Tender Documents</h2>
                <button
                  className="um-btn-upload-new"
                  onClick={() => setUploadModal({ isOpen: true, docType: "tender" })}
                >
                  ➕ Upload Tender Document
                </button>
              </div>

              {tenderDocs.length === 0 ? (
                <div className="um-empty-section">
                  <p>No tender documents found</p>
                  <button
                    className="um-btn-upload-new"
                    onClick={() => setUploadModal({ isOpen: true, docType: "tender" })}
                  >
                    ➕ Upload First Tender Document
                  </button>
                </div>
              ) : (
                <div className="um-docs-grid">
                  {tenderDocs.map((doc) => (
                    <DocumentCard
                      key={doc.tenderid}
                      doc={doc}
                      docType="tender"
                      onView={() => handleView(doc, "tender")}
                      onDelete={() =>
                        setConfirmDelete({ isOpen: true, data: doc, docType: "tender" })
                      }
                    />
                  ))}
                </div>
              )}

              {/* Vendor Documents Section */}
              <div className="um-section-header um-section-header-vendor">
                <h2>🏢 Vendor Documents</h2>
                <button
                  className="um-btn-upload-new"
                  onClick={() => setUploadModal({ isOpen: true, docType: "vendor" })}
                >
                  ➕ Upload Vendor Document
                </button>
              </div>

              {vendorDocs.length === 0 ? (
                <div className="um-empty-section">
                  <p>No vendor documents found</p>
                  <button
                    className="um-btn-upload-new"
                    onClick={() => setUploadModal({ isOpen: true, docType: "vendor" })}
                  >
                    ➕ Upload First Vendor Document
                  </button>
                </div>
              ) : (
                <div className="um-docs-grid">
                  {vendorDocs.map((doc) => (
                    <DocumentCard
                      key={doc.vendorid}
                      doc={doc}
                      docType="vendor"
                      onView={() => handleView(doc, "vendor")}
                      onDelete={() =>
                        setConfirmDelete({ isOpen: true, data: doc, docType: "vendor" })
                      }
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="um-empty-state">
              <p>👈 Select a tender from the dropdown above to view all related documents</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {uploadModal.isOpen && (
        <UploadModal
          selectedId={selectedTender}
          docType={uploadModal.docType}
          onUpload={handleUploadFile}
          onCancel={() => setUploadModal({ isOpen: false, docType: null })}
          loading={uploadLoading}
        />
      )}

      {confirmDelete.isOpen && (
        <ConfirmDialog
          message={`Are you sure you want to delete "${
            confirmDelete.data?.title || confirmDelete.data?.filename
          }"? This action cannot be undone.`}
          onConfirm={() => handleDelete(confirmDelete.data, confirmDelete.docType)}
          onCancel={() => setConfirmDelete({ isOpen: false, data: null, docType: null })}
        />
      )}
    </div>
  );
}
