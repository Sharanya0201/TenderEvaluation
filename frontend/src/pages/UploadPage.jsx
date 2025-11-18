// src/pages/UploadPage.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext";
import Sidebar from "./Sidebar";
import "../styles/UploadPage.css";

// Vite-friendly API base (use .env VITE_API_BASE), fallback to http://localhost:8000
const API_BASE_URL = (import.meta.env && import.meta.env.VITE_API_BASE) || "http://localhost:8000";
const API_BASE = `${API_BASE_URL}/api/v1`;

export default function UploadPage() {
  const { currentUser } = useAuth();
  const { isCollapsed } = useSidebar();

  // Tender upload state
  const [tenderTitle, setTenderTitle] = useState("");
  const [tenderFiles, setTenderFiles] = useState([]);
  const [tenderMsg, setTenderMsg] = useState(null);
  const [tenderLoading, setTenderLoading] = useState(false);
  const [tenderExtractedData, setTenderExtractedData] = useState(null);
  const [showTenderData, setShowTenderData] = useState(false);

  // Vendor (folder) upload state
  const [vendorTenderId, setVendorTenderId] = useState("");
  const [vendorFiles, setVendorFiles] = useState([]);
  const [vendorMsg, setVendorMsg] = useState(null);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendorExtractedData, setVendorExtractedData] = useState(null);
  const [showVendorData, setShowVendorData] = useState(false);

  // Tenders list state for dropdown
  const [tenders, setTenders] = useState([]);
  const [tendersLoading, setTendersLoading] = useState(false);

  // Track the currently uploaded tender
  const [uploadedTenderId, setUploadedTenderId] = useState(null);
  const [uploadedTenderTitle, setUploadedTenderTitle] = useState(null);

  // Load tenders on component mount
  useEffect(() => {
    loadTenders();
  }, []);

  const loadTenders = async () => {
    try {
      setTendersLoading(true);
      const response = await fetch(`${API_BASE}/uploads/tenders/list?limit=1000`);
      const data = await response.json();
      if (data.success) {
        setTenders(data.data || []);
      }
    } catch (error) {
      console.error("Error loading tenders:", error);
    } finally {
      setTendersLoading(false);
    }
  };

  // Utility: get uploader string from currentUser
  const getUploaderString = () => {
    if (!currentUser) return "guest";
    return currentUser.username || currentUser.email || `user_${currentUser.id || "unknown"}`;
  };

  // Tender upload handler
  const handleTenderSubmit = async (e) => {
    e.preventDefault();
    setTenderMsg(null);
    setTenderExtractedData(null);
    setShowTenderData(false);
    setTenderLoading(true);

    try {
      // If no files selected, validate title is provided
      if (tenderFiles.length === 0) {
        setTenderMsg("⚠ Please select at least one file to upload");
        setTenderLoading(false);
        return;
      }

      // Upload each file
      let uploadedCount = 0;
      let currentTenderId = null;
      const allExtractedData = [];

      for (let i = 0; i < tenderFiles.length; i++) {
        const file = tenderFiles[i];
        const fd = new FormData();

        // For first file: include title to create new tender
        // For subsequent files: include tenderid to attach to existing tender
        if (i === 0) {
          fd.append("title", tenderTitle);
        } else {
          fd.append("tenderid", currentTenderId);
        }

        fd.append("tenderform", "");
        fd.append("uploadedby", getUploaderString());
        fd.append("file", file);

        const res = await fetch(`${API_BASE}/upload/tender`, {
          method: "POST",
          body: fd,
        });

        const data = await res.json().catch(() => null);
        
        if (!res.ok) {
          setTenderMsg(
            `Upload failed for ${file.name}: ${data?.detail || res.statusText}`
          );
          setTenderLoading(false);
          return;
        }

        const tender = data?.tender;
        currentTenderId = tender?.tenderid;

        if (i === 0) {
          // First upload - store tender ID and title for vendor section
          setVendorTenderId(String(currentTenderId));
          setUploadedTenderId(currentTenderId);
          setUploadedTenderTitle(tender?.title || tenderTitle);
        }

        uploadedCount++;

        // Collect extracted data with tender ID
        if (data?.form_data) {
          allExtractedData.push({
            tenderid: currentTenderId,
            filename: file.name,
            ...data.form_data
          });
        }
      }

      // Show success message
      setTenderMsg(
        `✓ Successfully uploaded ${uploadedCount} file(s) to Tender ID: ${currentTenderId}`
      );

      // Store and display extracted data
      if (allExtractedData.length > 0) {
        setTenderExtractedData(allExtractedData);
        setShowTenderData(true);
      }

      // Clear form
      setTenderTitle("");
      setTenderFiles([]);
    } catch (err) {
      setTenderMsg("Error: " + err.message);
    } finally {
      setTenderLoading(false);
    }
  };

  // Vendor folder picker (webkitdirectory) change
  const handleVendorFolderChange = (e) => {
    const files = Array.from(e.target.files || []);
    setVendorFiles(files);
  };

  // Tender file picker change
  const handleTenderFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setTenderFiles(files);
  };

  // Vendor upload handler (multiple files)
  const handleVendorUpload = async (e) => {
    e.preventDefault();
    setVendorMsg(null);
    setVendorExtractedData(null);
    setShowVendorData(false);

    // If vendorTenderId is not provided, try to use the recently uploaded tender id
    if (!vendorTenderId) {
      setVendorMsg("No Tender ID available — upload a tender first or enter the Tender ID manually.");
      return;
    }
    if (!vendorFiles || vendorFiles.length === 0) {
      setVendorMsg("No files selected.");
      return;
    }

    setVendorLoading(true);
    try {
      const fd = new FormData();
      fd.append("tenderid", vendorTenderId);
      fd.append("vendorform", "");
      fd.append("uploadedby", getUploaderString());

      vendorFiles.forEach((file) => {
        // preserve relative path where possible (webkitRelativePath)
        fd.append("files", file, file.webkitRelativePath || file.name);
      });

      const res = await fetch(`${API_BASE}/upload/vendors`, {
        method: "POST",
        body: fd,
        // credentials: 'include', // uncomment if using cookie auth
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setVendorMsg("Upload failed: " + (data?.detail || JSON.stringify(data) || res.statusText));
      } else {
        const savedCount = data?.saved?.length ?? 0;
        setVendorMsg(`✓ Successfully uploaded ${savedCount} vendor file(s) with data extraction.`);
        
        // Store and display extracted data summary
        if (data?.saved && data.saved.length > 0) {
          setVendorExtractedData(data.saved);
          setShowVendorData(true);
        }
        
        setVendorFiles([]);
        setVendorTenderId("");
      }
    } catch (err) {
      setVendorMsg("Error: " + err.message);
    } finally {
      setVendorLoading(false);
    }
  };

  return (
    <div style={{ 
      display: "flex", 
      minHeight: "100vh", 
      backgroundColor: "#f5f7fa",
      margin: 0,
      padding: 0 
    }}>
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div 
        className="upload-page-container"
        style={{
          marginLeft: isCollapsed ? "80px" : "280px",
          width: isCollapsed ? "calc(100vw - 80px)" : "calc(100vw - 280px)",
        }}
      >
      <div className="upload-page-header">
        <h1 className="upload-page-title">Document Upload</h1>
        <p className="upload-page-subtitle">Upload tenders and vendor documents with automatic data extraction</p>
        {/* <p className="upload-api-info">API base: <code>{API_BASE}</code></p> */}
      </div>

      {/* Tender Upload */}
      <section className="upload-section">
        <h2 className="upload-section-title">📋 Upload Tender</h2>
        <p className="upload-section-subtitle">Upload tender documents with automatic data extraction. Select multiple files to attach all to the same tender.</p>
        
        <form onSubmit={handleTenderSubmit}>
          <div className="upload-form-group">
            <label htmlFor="tender-title">Tender Title *</label>
            <input
              id="tender-title"
              type="text"
              className="upload-input"
              value={tenderTitle}
              required
              onChange={(e) => setTenderTitle(e.target.value)}
              placeholder="Enter tender title"
            />
          </div>

          <div className="upload-form-group">
            <label htmlFor="tender-files">Attach Files (PDF, Excel, Word, etc.)</label>
            <input
              id="tender-files"
              type="file"
              className="upload-file-input"
              onChange={handleTenderFileChange}
              accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.txt"
              multiple
            />
          </div>

          {tenderFiles.length > 0 && (
            <div className="upload-file-list">
              <div className="upload-file-list-title">Selected Files ({tenderFiles.length})</div>
              <ul>
                {tenderFiles.map((f, i) => (
                  <li key={i}>
                    <span>{f.name}</span>
                    <button
                      type="button"
                      className="upload-file-remove-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        setTenderFiles(tenderFiles.filter((_, index) => index !== i));
                      }}
                      disabled={tenderLoading}
                      title="Remove this file"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button type="submit" className="upload-button" disabled={tenderLoading}>
            {tenderLoading ? "Uploading & Extracting..." : "Upload Tender"}
          </button>
        </form>

        {tenderMsg && (
          <div className={`upload-message ${tenderMsg.startsWith("✓") ? "success" : tenderMsg.startsWith("⚠") ? "info" : "error"}`}>
            {tenderMsg}
          </div>
        )}

        {/* Display extracted tender data */}
        {showTenderData && tenderExtractedData && (
          <div className="upload-data-section">
            <h3 className="upload-data-title">📄 Extracted Document Data ({Array.isArray(tenderExtractedData) ? tenderExtractedData.length : 1} files)</h3>
            
            {Array.isArray(tenderExtractedData) ? (
              // Multiple files
              <div className="upload-summary-table-wrapper">
                <table className="upload-summary-table">
                  <thead>
                    <tr>
                      <th>Tender ID</th>
                      <th>Filename</th>
                      <th>File Type</th>
                      <th>Extraction Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenderExtractedData.map((data, idx) => (
                      <tr key={idx}>
                        <td>{data.tenderid || "N/A"}</td>
                        <td>{data.filename || `File ${idx + 1}`}</td>
                        <td>{data.file_type || "Unknown"}</td>
                        <td className={data.status === "success" ? "upload-summary-status-success" : "upload-summary-status-warning"}>
                          {data.status === "success" ? "✓ Extracted" : `⚠ ${data.status}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <details className="upload-data-details" style={{ marginTop: "1rem" }}>
                  <summary>View Full JSON Data</summary>
                  <pre className="upload-data-json">
                    {JSON.stringify(tenderExtractedData, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              // Single file (for backward compatibility)
              <>
                <details className="upload-data-details">
                  <summary>View Full JSON Data</summary>
                  <pre className="upload-data-json">
                    {JSON.stringify(tenderExtractedData, null, 2)}
                  </pre>
                </details>
                
                {tenderExtractedData.file_type && (
                  <div className="upload-summary-info">
                    <div className="upload-summary-item">
                      <div className="upload-summary-item-label">File Type</div>
                      <div className="upload-summary-item-value">{tenderExtractedData.file_type}</div>
                    </div>
                    <div className="upload-summary-item">
                      <div className="upload-summary-item-label">Filename</div>
                      <div className="upload-summary-item-value">{tenderExtractedData.filename || "N/A"}</div>
                    </div>
                    <div className="upload-summary-item">
                      <div className="upload-summary-item-label">Status</div>
                      <div className={`upload-summary-item-value ${tenderExtractedData.status === "success" ? "upload-summary-status-success" : "upload-summary-status-warning"}`}>
                        {tenderExtractedData.status}
                      </div>
                    </div>
                    {tenderExtractedData.extraction_method && (
                      <div className="upload-summary-item">
                        <div className="upload-summary-item-label">Method</div>
                        <div className="upload-summary-item-value">{tenderExtractedData.extraction_method}</div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <hr className="upload-divider" />

      {/* Vendor Upload */}
      <section className={`upload-section ${!uploadedTenderId ? "upload-section-disabled" : ""}`}>
        <h2 className="upload-section-title">👥 Upload Vendor Files</h2>
        <p className="upload-section-subtitle">Select a folder or individual files to attach to a tender. Auto-linked to the tender you just uploaded.</p>

        {!uploadedTenderId && (
          <div className="upload-info-message upload-info-warning">
            <span className="upload-info-icon">⚠️</span>
            <span className="upload-info-text">Please upload a tender first before uploading vendor files.</span>
          </div>
        )}

        <form onSubmit={handleVendorUpload} disabled={!uploadedTenderId}>
          <div className="upload-form-group">
            {uploadedTenderTitle ? (
              <>
                <label>Attaching to Tender</label>
                <div className="upload-tender-display">
                  <span className="upload-tender-title">{uploadedTenderTitle}</span>
                  <span className="upload-tender-id">(ID: {uploadedTenderId})</span>
                </div>
              </>
            ) : (
              <>
                <label htmlFor="vendor-tender-select">Attach to Tender *</label>
                <select
                  id="vendor-tender-select"
                  className="upload-input"
                  value={vendorTenderId}
                  required
                  onChange={(e) => setVendorTenderId(e.target.value)}
                >
                  <option value="">-- Please upload a tender first --</option>
                  {tenders.map((tender) => (
                    <option key={tender.tenderid} value={tender.tenderid}>
                      {tender.title} (ID: {tender.tenderid})
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          <div className="upload-form-group">
            <label htmlFor="vendor-files">Choose Folder or Files *</label>
            <input
              id="vendor-files"
              type="file"
              className="upload-file-input"
              webkitdirectory="true"
              directory="true"
              multiple
              disabled={!uploadedTenderId}
              onChange={handleVendorFolderChange}
              accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.txt,.jpg,.jpeg,.png"
            />
          </div>

          {vendorFiles.length > 0 && (
            <div className="upload-file-list">
              <div className="upload-file-list-title">Selected Files ({vendorFiles.length})</div>
              <ul>
                {vendorFiles.slice(0, 500).map((f, i) => (
                  <li key={i}>
                    <span>{f.webkitRelativePath || f.name}</span>
                    <button
                      type="button"
                      className="upload-file-remove-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        setVendorFiles(vendorFiles.filter((_, index) => index !== i));
                      }}
                      disabled={vendorLoading}
                      title="Remove this file"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button 
            type="submit" 
            className="upload-button" 
            disabled={vendorLoading || !uploadedTenderId || vendorFiles.length === 0}
          >
            {vendorLoading ? "Uploading & Extracting..." : "Upload Vendor Files"}
          </button>
        </form>

        {vendorMsg && (
          <div className={`upload-message ${vendorMsg.startsWith("✓") ? "success" : vendorMsg.includes("available") ? "info" : "error"}`}>
            {vendorMsg}
          </div>
        )}

        {/* Display extracted vendor data summary */}
        {showVendorData && vendorExtractedData && (
          <div className="upload-data-section">
            <h3 className="upload-data-title">📦 Vendor Files Extraction Summary</h3>
            <table className="upload-summary-table">
              <thead>
                <tr>
                  <th>Vendor ID</th>
                  <th>Filename</th>
                  <th>Extraction Status</th>
                </tr>
              </thead>
              <tbody>
                {vendorExtractedData.map((vendor, idx) => (
                  <tr key={idx}>
                    <td>{vendor.vendorid}</td>
                    <td>{vendor.filename}</td>
                    <td className={vendor.form_data_status === "success" ? "upload-summary-status-success" : vendor.form_data_status === "extraction_failed" ? "upload-summary-status-failed" : "upload-summary-status-warning"}>
                      {vendor.form_data_status === "success" ? "✓ Extracted" : vendor.form_data_status === "extraction_failed" ? "✗ Failed" : `⚠ ${vendor.form_data_status}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="upload-summary-note">
              Use the Vendor ID to retrieve full extracted data from the <code>/vendor/{"{vendorid}"}</code> endpoint
            </p>
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
