import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useSidebar } from '../context/SidebarContext';
import { getTenders, getTenderTypes, updateTender, deleteTender, getTender } from '../api/auth';
import tenderTypes from '../data/tenderTypes.json';
import '../styles/TenderStatus.css';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

const ConfirmDialog = ({ title, message, onConfirm, onCancel }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.45)",
      backdropFilter: "blur(4px)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000
    }}
  >
    <div
      style={{
        background: "#fff",
        padding: "2rem",
        borderRadius: "1rem",
        width: "90%",
        maxWidth: "400px",
        textAlign: "center",
        boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
        animation: "popIn 0.2s ease-out"
      }}
    >
      <h3 style={{ fontSize: "1.4rem", fontWeight: "600", color: "#2c3e50" }}>
        {title}
      </h3>
      <p style={{ color: "#555", margin: "1rem 0 1.5rem" }}>{message}</p>
      <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
        <button
          onClick={onCancel}
          style={{
            background: "#e0e0e0",
            color: "#333",
            border: "none",
            padding: "0.6rem 1.2rem",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "0.2s"
          }}
          onMouseEnter={(e) => (e.target.style.background = "#d0d0d0")}
          onMouseLeave={(e) => (e.target.style.background = "#e0e0e0")}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            background: "#e74c3c",
            color: "#fff",
            border: "none",
            padding: "0.6rem 1.2rem",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "0.2s"
          }}
          onMouseEnter={(e) => (e.target.style.background = "#c0392b")}
          onMouseLeave={(e) => (e.target.style.background = "#e74c3c")}
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
);

// Column Filter Component
const ColumnFilter = ({ column, filterValue, onFilterChange, onClearFilter }) => (
  <div className="column-filter">
    <input
      type="text"
      placeholder={`Filter ${column}...`}
      value={filterValue}
      onChange={(e) => onFilterChange(column, e.target.value)}
      className="column-filter-input"
    />
    {filterValue && (
      <button
        className="clear-filter-btn"
        onClick={() => onClearFilter(column)}
        title="Clear filter"
      >
        ✕
      </button>
    )}
  </div>
);

const TenderStatus = () => {
  const { isCollapsed } = useSidebar();
  const [tenders, setTenders] = useState([]);
  const [allTenders, setAllTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [tendersPerPage] = useState(10);
  const [exportLoading, setExportLoading] = useState(false);
  const [editingTender, setEditingTender] = useState(null);
  const [editForm, setEditForm] = useState({ tender: '', description: '', status: '' });
  const [availableTitles, setAvailableTitles] = useState([]);
  const [tenderTypeOptions, setTenderTypeOptions] = useState([]);
  const [allTenderTypes, setAllTenderTypes] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    tender: null
  });

  // Column filters state
  const [columnFilters, setColumnFilters] = useState({
    id: "",
    title: "",
    status: "",
    created_at: ""
  });

  const tableRef = useRef();

  // Status options
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Open', label: 'Open' },
    { value: 'Evaluation', label: 'Evaluation' },
    { value: 'Awarded', label: 'Awarded' },
    { value: 'Closed', label: 'Closed' }
  ];

  useEffect(() => {
    loadTenderTypes();
  }, []);

  useEffect(() => {
    if (tenderTypeOptions.length > 0) {
      loadTenders();
    }
  }, [tenderTypeOptions.length]);

  const loadTenderTypes = async () => {
    try {
      const res = await getTenderTypes();
      const serverTypes = res?.tender_types || [];
      const allTypes = serverTypes.map(t => ({ id: t.id, code: t.code, name: t.name || t.code, icon: t.icon || '' }));
      setAllTenderTypes(allTypes);
      const options = [
        { code: '', name: 'All Types', icon: '' },
        ...allTypes.map(t => ({ code: t.code, name: t.name, icon: t.icon }))
      ];
      setTenderTypeOptions(options);
    } catch (e) {
      console.error('Failed to load tender types:', e);
      const fallback = [
        { code: '', name: 'All Types', icon: '' },
        ...Object.keys(tenderTypes).map(code => ({
          code,
          name: tenderTypes[code]?.name || code,
          icon: tenderTypes[code]?.icon || ''
        }))
      ];
      setTenderTypeOptions(fallback);
      setAllTenderTypes(Object.keys(tenderTypes).map(code => ({
        code,
        name: tenderTypes[code]?.name || code,
        icon: tenderTypes[code]?.icon || ''
      })));
    }
  };

  const loadTenders = async () => {
    setLoading(true);
    try {
      const response = await getTenders();
      // The API returns { success, total, skip, limit, tenders: [...] }
      const tendersList = response?.tenders || [];
      if (Array.isArray(tendersList)) {
        setAllTenders(tendersList);
        setTenders(tendersList);
        // Extract unique tenders for dropdown
        const uniqueTenders = [...new Set(tendersList.filter(t => t.title).map(t => t.title))].sort();
        setAvailableTitles(uniqueTenders);
      } else {
        setAllTenders([]);
        setTenders([]);
        setAvailableTitles([]);
      }
    } catch (error) {
      console.error('Failed to load tenders:', error);
      toast.error('Failed to load tenders');
      setAllTenders([]);
      setTenders([]);
      setAvailableTitles([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle column filter change
  const handleColumnFilterChange = (column, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
    setCurrentPage(1);
  };

  // Clear specific column filter
  const clearColumnFilter = (column) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: ""
    }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setColumnFilters({
      id: "",
      title: "",
      status: "",
      created_at: ""
    });
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Apply all filters
  const filteredTenders = tenders.filter((tender) => {
    // Global search filter
    const globalSearchMatch = 
      searchTerm === "" ||
      (tender.tenderid?.toString() || "").includes(searchTerm) ||
      (tender.title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (tender.filename?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (tender.status?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    // Column-wise filters
    const idMatch = 
      columnFilters.id === "" ||
      (tender.tenderid?.toString() || "").includes(columnFilters.id);

    const titleMatch = 
      columnFilters.title === "" ||
      (tender.title?.toLowerCase() || "").includes(columnFilters.title.toLowerCase());

    const statusMatch = 
      columnFilters.status === "" ||
      (tender.status?.toLowerCase() || "").includes(columnFilters.status.toLowerCase());

    const dateMatch = 
      columnFilters.created_at === "" ||
      formatDate(tender.createddate).includes(columnFilters.created_at);

    return globalSearchMatch && idMatch && titleMatch && statusMatch && dateMatch;
  });

  const indexOfLastTender = currentPage * tendersPerPage;
  const indexOfFirstTender = indexOfLastTender - tendersPerPage;
  const currentTenders = filteredTenders.slice(indexOfFirstTender, indexOfLastTender);
  const totalPages = Math.ceil(filteredTenders.length / tendersPerPage);

  // Check if any filters are active
  const hasActiveFilters = searchTerm !== "" || Object.values(columnFilters).some(filter => filter !== "");

  const handleEdit = async (tender) => {
    // Use the tender data directly without fetching again since we already have it
    setEditingTender(tender);
    setEditForm({
      tender: tender.title || '',
      description: tender.filename || '',
      status: tender.status || 'Draft'
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTender) return;
    
    try {
      // The API expects title and status as form data
      const updateData = {
        title: editForm.tender,
        status: editForm.status
      };
      await updateTender(editingTender.tenderid, updateData);
      toast.success('Tender updated successfully');
      setEditingTender(null);
      loadTenders();
    } catch (error) {
      toast.error('Failed to update tender');
    }
  };

  const handleDelete = (tender) => {
    setConfirmDialog({
      isOpen: true,
      tender
    });
  };

  const confirmDelete = async () => {
    const tender = confirmDialog.tender;
    if (!tender) {
      setConfirmDialog({ isOpen: false, tender: null });
      return;
    }

    try {
      // Use tenderid for deletion
      await deleteTender(tender.tenderid);
      toast.success('Tender deleted successfully');
      loadTenders();
    } catch (error) {
      console.error('Delete tender error:', error);
      let errorMessage = 'Failed to delete tender';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.detail) {
        errorMessage = error.detail;
      }
      
      // Check for network errors
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = 'Network error: Could not connect to server. Please check your connection and try again.';
      }
      
      toast.error(errorMessage);
    } finally {
      setConfirmDialog({ isOpen: false, tender: null });
    }
  };

  const cancelDelete = () => {
    setConfirmDialog({ isOpen: false, tender: null });
  };


  const getStatusBadgeClass = (status) => {
    const statusLower = status?.toLowerCase() || 'draft';
    return `status-badge status-${statusLower}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Export to Excel
  const exportToExcel = () => {
    setExportLoading(true);
    try {
      const dataToExport = filteredTenders.map(tender => ({
        'ID': tender.tenderid || '',
        'Title': tender.title || '',
        'Filename': tender.filename || '',
        'Status': tender.status || 'Draft',
        'Created Date': formatDate(tender.createddate),
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Tenders');
      
      const colWidths = [
        { wch: 8 },  // ID
        { wch: 25 }, // Title
        { wch: 40 }, // Filename
        { wch: 15 }, // Status
        { wch: 15 }, // Created Date
      ];
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, `tenders_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Tenders exported to Excel successfully');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export to Excel');
    } finally {
      setExportLoading(false);
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    setExportLoading(true);
    try {
      const doc = new jsPDF();
      
      doc.setProperties({
        title: 'Tender Management Report',
        subject: 'Tenders Export',
        author: 'Tender Management System'
      });

      doc.setFontSize(16);
      doc.setTextColor(44, 62, 80);
      doc.setFont("helvetica", "bold");
      doc.text("Tender Management Report", 105, 15, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 22, { align: "center" });

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Tenders: ${filteredTenders.length}`, 14, 32);

      const headerY = 42;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(12, 109, 197);
      
      doc.rect(14, headerY, 15, 8, 'F');
      doc.rect(29, headerY, 40, 8, 'F');
      doc.rect(69, headerY, 35, 8, 'F');
      doc.rect(104, headerY, 25, 8, 'F');
      
      doc.text("ID", 16, headerY + 6);
      doc.text("Tender", 31, headerY + 6);
      doc.text("Status", 71, headerY + 6);
      doc.text("Created", 106, headerY + 6);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      
      let currentY = headerY + 16;
      
      filteredTenders.forEach((tender, index) => {
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 255, 255);
          doc.setFillColor(12, 109, 197);
          doc.rect(14, currentY, 15, 8, 'F');
          doc.rect(29, currentY, 40, 8, 'F');
          doc.rect(69, currentY, 35, 8, 'F');
          doc.rect(104, currentY, 25, 8, 'F');
          doc.text("ID", 16, currentY + 6);
          doc.text("Tender", 31, currentY + 6);
          doc.text("Status", 71, currentY + 6);
          doc.text("Created", 106, currentY + 6);
          currentY += 16;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);
        }

        if (index % 2 === 0) {
          doc.setFillColor(245, 247, 250);
          doc.rect(14, currentY - 4, 115, 8, 'F');
        }

        doc.text((tender.tenderid || 'N/A').toString(), 16, currentY);
        
        const tenderText = tender.title || 'N/A';
        doc.text(tenderText.length > 25 ? tenderText.substring(0, 22) + '...' : tenderText, 31, currentY);
        
        doc.text(tender.status || 'Draft', 71, currentY);
        doc.text(formatDate(tender.createddate), 106, currentY);
        
        currentY += 10;
      });

      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${i} of ${totalPages} - Confidential - Tender Management System`,
          105,
          285,
          { align: "center" }
        );
      }

      doc.save(`tenders_export_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Tenders exported to PDF successfully');
      
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Failed to export to PDF: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      
      <div
        style={{
          flex: 1,
          padding: "2rem",
          backgroundColor: "#f5f7fa",
          marginLeft: isCollapsed ? "80px" : "280px",
          minHeight: "100vh",
          transition: "all 0.3s ease",
          position: "relative"
        }}
      >
        {editingTender && (
          <div
            className="modal-backdrop"
            onClick={() => {
              setEditingTender(null);
            }}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 1000
            }}
          />
        )}

        {editingTender && (
          <div
            className="modal-container"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1001,
              padding: "2rem"
            }}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h2>Edit Tender</h2>
                <button 
                  className="modal-close"
                  onClick={() => {
                    setEditingTender(null);
                  }}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Tender: *</label>
                  <input
                    type="text"
                    value={editForm.tender}
                    readOnly
                    className="form-input"
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                </div>
                <div className="form-group">
                  <label>Description:</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="form-textarea"
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>Status:</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="form-select"
                  >
                    {statusOptions.filter(opt => opt.value).map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setEditingTender(null)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={handleSaveEdit}>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem"
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "#2c3e50" }}>
              Tender Management
            </h1>
            <p style={{ margin: "0.5rem 0 0", color: "#7f8c8d" }}>
              Manage and track your tenders
            </p>
          </div>
        </div>

        <div className="role-management-actions">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search all tenders..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          
          <div className="export-buttons-container">
            {hasActiveFilters && (
              <button 
                className="clear-filters-button"
                onClick={clearAllFilters}
                title="Clear all filters"
              >
                🗑️ Clear Filters
              </button>
            )}
            <button 
              className="export-button export-excel" 
              onClick={exportToExcel}
              disabled={exportLoading || filteredTenders.length === 0}
            >
              {exportLoading ? 'Exporting...' : '📊 Export Excel'}
            </button>
            <button 
              className="export-button export-pdf" 
              onClick={exportToPDF}
              disabled={exportLoading || filteredTenders.length === 0}
            >
              {exportLoading ? 'Exporting...' : '📄 Export PDF'}
            </button>
          </div>
        </div>

        <div className="roles-table-container" ref={tableRef}>
          {loading ? (
            <div className="loading-state">Loading tenders...</div>
          ) : (
            <>
              <div className="table-info">
                {filteredTenders.length > 0 ? (
                  <>
                    Showing {indexOfFirstTender + 1}-{Math.min(indexOfLastTender, filteredTenders.length)} of {filteredTenders.length} tenders
                    {hasActiveFilters && (
                      <span className="filter-indicator">
                        (Filtered from {tenders.length} total tenders)
                      </span>
                    )}
                  </>
                ) : (
                  <div className="empty-table-info">
                    {hasActiveFilters ? "No tenders found matching your filters" : "No tenders available"}
                    {hasActiveFilters && (
                      <button 
                        className="clear-filters-inline"
                        onClick={clearAllFilters}
                      >
                        Clear filters to see all tenders
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <table className="roles-table">
                <thead>
                  <tr>
                    <th>
                      <div className="column-header">
                        ID
                        <ColumnFilter
                          column="id"
                          filterValue={columnFilters.id}
                          onFilterChange={handleColumnFilterChange}
                          onClearFilter={clearColumnFilter}
                        />
                      </div>
                    </th>
                    <th>
                      <div className="column-header">
                        Tender
                        <ColumnFilter
                          column="title"
                          filterValue={columnFilters.title}
                          onFilterChange={handleColumnFilterChange}
                          onClearFilter={clearColumnFilter}
                        />
                      </div>
                    </th>
                    <th>
                      <div className="column-header">
                        Status
                        <ColumnFilter
                          column="status"
                          filterValue={columnFilters.status}
                          onFilterChange={handleColumnFilterChange}
                          onClearFilter={clearColumnFilter}
                        />
                      </div>
                    </th>
                    <th>
                      <div className="column-header">
                        Created
                        <ColumnFilter
                          column="created_at"
                          filterValue={columnFilters.created_at}
                          onFilterChange={handleColumnFilterChange}
                          onClearFilter={clearColumnFilter}
                        />
                      </div>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {currentTenders.length > 0 ? (
                    currentTenders.map((tender) => {
                      return (
                        <tr key={tender.tenderid}>
                          <td>{tender.tenderid}</td>
                          <td className="role-name-cell">
                            <div className="role-avatar">
                              {(tender.title?.charAt(0).toUpperCase() || 'T')}
                            </div>
                            {tender.title || 'N/A'}
                          </td>
                          <td>
                            <span className={getStatusBadgeClass(tender.status)}>
                              {tender.status || 'Draft'}
                            </span>
                          </td>
                          <td>
                            {formatDate(tender.createddate)}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="action-btn edit-btn"
                                onClick={() => handleEdit(tender)}
                                title="Edit Tender"
                              >
                                ✏️
                              </button>
                              <button
                                className="action-btn delete-btn"
                                onClick={() => handleDelete(tender)}
                                title="Delete Tender"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="empty-row">
                      <td colSpan="5" className="empty-state-cell">
                        <div className="empty-state">
                          {hasActiveFilters ? (
                            <>
                              <p>No tenders found matching your current filters.</p>
                              <button 
                                className="clear-filters-inline"
                                onClick={clearAllFilters}
                              >
                                Clear all filters
                              </button>
                            </>
                          ) : (
                            <p>No tenders available in the system.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {totalPages > 1 && filteredTenders.length > 0 && (
                <div className="pagination">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => paginate(page)}
                        className={`pagination-btn ${
                          currentPage === page ? "active" : ""
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {confirmDialog.isOpen && (
          <ConfirmDialog
            title="Confirm Delete"
            message={`Are you sure you want to delete tender "${confirmDialog.tender?.title || confirmDialog.tender?.tenderid}"? This action cannot be undone.`}
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
          />
        )}
      </div>
    </div>
  );
};

export default TenderStatus;
