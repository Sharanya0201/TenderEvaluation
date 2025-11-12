import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  toggleRoleStatus
} from "../api/auth";
import RoleForm from "../components/RoleForm";
import { useSidebar } from "../context/SidebarContext";
import "../styles/RoleManagement.css";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

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

const RoleManagementPage = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rolesPerPage] = useState(10);
  const [exportLoading, setExportLoading] = useState(false);
  const { isCollapsed } = useSidebar();

  // Column filters state
  const [columnFilters, setColumnFilters] = useState({
    role_name: "",
    description: "",
    is_active: "",
    created_at: ""
  });

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    role: null
  });

  const tableRef = useRef();

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await getRoles();
      if (response.success) {
        setRoles(response.roles || []);
      } else {
        toast.error("Failed to load roles");
      }
    } catch (error) {
      console.error("Error loading roles:", error);
      toast.error("Error loading roles");
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
      role_name: "",
      description: "",
      is_active: "",
      created_at: ""
    });
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Apply all filters
  const filteredRoles = roles.filter((role) => {
    // Global search filter
    const globalSearchMatch = 
      searchTerm === "" ||
      (role.role_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (role.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    // Column-wise filters
    const roleNameMatch = 
      columnFilters.role_name === "" ||
      (role.role_name?.toLowerCase() || "").includes(columnFilters.role_name.toLowerCase());

    const descriptionMatch = 
      columnFilters.description === "" ||
      (role.description?.toLowerCase() || "").includes(columnFilters.description.toLowerCase());

    const statusMatch = 
      columnFilters.is_active === "" ||
      (columnFilters.is_active === "active" && role.is_active) ||
      (columnFilters.is_active === "inactive" && !role.is_active);

    const dateMatch = 
      columnFilters.created_at === "" ||
      new Date(role.created_at).toLocaleDateString().includes(columnFilters.created_at);

    return globalSearchMatch && roleNameMatch && descriptionMatch && statusMatch && dateMatch;
  });

  const indexOfLastRole = currentPage * rolesPerPage;
  const indexOfFirstRole = indexOfLastRole - rolesPerPage;
  const currentRoles = filteredRoles.slice(indexOfFirstRole, indexOfLastRole);
  const totalPages = Math.ceil(filteredRoles.length / rolesPerPage);

  // Check if any filters are active
  const hasActiveFilters = searchTerm !== "" || Object.values(columnFilters).some(filter => filter !== "");

  const handleAddRole = () => {
    setEditingRole(null);
    setShowForm(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setShowForm(true);
  };

  const handleDeleteRole = (role) => {
    setConfirmDialog({
      isOpen: true,
      role
    });
  };

  const confirmDeleteRole = async () => {
    const role = confirmDialog.role;
    if (!role) return;

    try {
      const response = await deleteRole(role.id);
      if (response.success) {
        toast.success("Role deactivated successfully");
        loadRoles();
      } else {
        toast.error(response.message || "Failed to deactivate role");
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      toast.error("Error deactivating role");
    } finally {
      setConfirmDialog({ isOpen: false, role: null });
    }
  };

  const cancelDeleteRole = () =>
    setConfirmDialog({ isOpen: false, role: null });

  const handleToggleStatus = async (role) => {
    const newStatus = !role.is_active;
    try {
      const response = await toggleRoleStatus(role.id, newStatus);
      if (response.success) {
        toast.success(
          `Role ${newStatus ? "activated" : "deactivated"} successfully`
        );
        loadRoles();
      } else {
        toast.error(response.message || "Failed to update role status");
      }
    } catch (error) {
      console.error("Error updating role status:", error);
      toast.error("Error updating role status");
    }
  };

  const handleFormSubmit = async (roleData) => {
    try {
      let response;
      if (editingRole) {
        response = await updateRole(editingRole.id, roleData);
      } else {
        response = await createRole(roleData);
      }

      if (response.success) {
        toast.success(
          editingRole ? "Role updated successfully" : "Role created successfully"
        );
        setShowForm(false);
        setEditingRole(null);
        loadRoles();
      } else {
        toast.error(
          response.message ||
            `Failed to ${editingRole ? "update" : "create"} role`
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(`Error ${editingRole ? "updating" : "creating"} role`);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingRole(null);
  };

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Export to Excel function
  const exportToExcel = () => {
    setExportLoading(true);
    try {
      const dataToExport = filteredRoles.map(role => ({
        'Role Name': role.role_name || '',
        'Description': role.description || '',
        'Status': role.is_active ? 'Active' : 'Inactive',
        'Created Date': new Date(role.created_at).toLocaleDateString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Roles');
      
      // Auto-size columns
      const colWidths = [
        { wch: 15 }, // Role Name
        { wch: 30 }, // Description
        { wch: 12 }, // Status
        { wch: 12 }, // Created Date
      ];
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, `roles_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Roles exported to Excel successfully');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export to Excel');
    } finally {
      setExportLoading(false);
    }
  };

 // Export to PDF function - Simple Format
const exportToPDF = () => {
  setExportLoading(true);
  try {
    const doc = new jsPDF();
    
    // Set document properties
    doc.setProperties({
      title: 'Role Management Report',
      subject: 'Roles Export',
      author: 'Tender Management System'
    });

    // Add title
    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80);
    doc.setFont("helvetica", "bold");
    doc.text("Role Management Report", 105, 15, { align: "center" });

    // Add date
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 22, { align: "center" });

    // Add summary
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Roles: ${filteredRoles.length}`, 14, 32);
    doc.text(`Active Roles: ${filteredRoles.filter(r => r.is_active).length}`, 14, 38);

    // Add table headers
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(12, 109, 197);
    
    // Header positions
    const headerY = 50;
    doc.rect(14, headerY, 40, 8, 'F');
    doc.rect(54, headerY, 80, 8, 'F');
    doc.rect(134, headerY, 25, 8, 'F');
    doc.rect(159, headerY, 35, 8, 'F');
    
    // Header text
    doc.text("Role Name", 16, headerY + 6);
    doc.text("Description", 56, headerY + 6);
    doc.text("Status", 136, headerY + 6);
    doc.text("Created", 161, headerY + 6);

    // Add table data
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    
    let currentY = headerY + 16;
    
    filteredRoles.forEach((role, index) => {
      // Check for page break
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
        
        // Redraw headers on new page
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(12, 109, 197);
        doc.rect(14, currentY, 40, 8, 'F');
        doc.rect(54, currentY, 80, 8, 'F');
        doc.rect(134, currentY, 25, 8, 'F');
        doc.rect(159, currentY, 35, 8, 'F');
        doc.text("Role Name", 16, currentY + 6);
        doc.text("Description", 56, currentY + 6);
        doc.text("Status", 136, currentY + 6);
        doc.text("Created", 161, currentY + 6);
        
        currentY += 16;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
      }

      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(245, 247, 250);
        doc.rect(14, currentY - 4, 180, 8, 'F');
      }

      // Role data
      doc.text(role.role_name || 'N/A', 16, currentY);
      
      // Truncate description if too long
      let description = role.description || 'N/A';
      if (description.length > 50) {
        description = description.substring(0, 47) + '...';
      }
      doc.text(description, 56, currentY);
      
      doc.text(role.is_active ? 'Active' : 'Inactive', 136, currentY);
      doc.text(new Date(role.created_at).toLocaleDateString(), 161, currentY);
      
      currentY += 10;
    });

    // Add footer
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

    // Save the PDF
    doc.save(`roles_export_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Roles exported to PDF successfully');
    
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
        {showForm && (
          <div
            className="modal-backdrop"
            onClick={handleFormCancel}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 1000
            }}
          />
        )}

        {showForm && (
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
              <RoleForm
                role={editingRole}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
                isEditing={!!editingRole}
              />
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
              Role Management
            </h1>
            <p style={{ margin: "0.5rem 0 0", color: "#7f8c8d" }}>
              Manage system roles and permissions
            </p>
          </div>
        </div>

        <div className="role-management-actions">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search all roles..."
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
              disabled={exportLoading || filteredRoles.length === 0}
            >
              {exportLoading ? 'Exporting...' : '📊 Export Excel'}
            </button>
            <button 
              className="export-button export-pdf" 
              onClick={exportToPDF}
              disabled={exportLoading || filteredRoles.length === 0}
            >
              {exportLoading ? 'Exporting...' : '📄 Export PDF'}
            </button>
            <button className="add-role-button" onClick={handleAddRole}>
              + Add Role
            </button>
          </div>
        </div>

        <div className="roles-table-container" ref={tableRef}>
          {loading ? (
            <div className="loading-state">Loading roles...</div>
          ) : (
            <>
              <div className="table-info">
                {filteredRoles.length > 0 ? (
                  <>
                    Showing {indexOfFirstRole + 1}-{Math.min(indexOfLastRole, filteredRoles.length)} of {filteredRoles.length} roles
                    {hasActiveFilters && (
                      <span className="filter-indicator">
                        (Filtered from {roles.length} total roles)
                      </span>
                    )}
                  </>
                ) : (
                  <div className="empty-table-info">
                    {hasActiveFilters ? "No roles found matching your filters" : "No roles available"}
                    {hasActiveFilters && (
                      <button 
                        className="clear-filters-inline"
                        onClick={clearAllFilters}
                      >
                        Clear filters to see all roles
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Always show table headers with filters */}
              <table className="roles-table">
                <thead>
                  <tr>
                    <th>
                      <div className="column-header">
                        Role Name
                        <ColumnFilter
                          column="role_name"
                          filterValue={columnFilters.role_name}
                          onFilterChange={handleColumnFilterChange}
                          onClearFilter={clearColumnFilter}
                        />
                      </div>
                    </th>
                    <th>
                      <div className="column-header">
                        Description
                        <ColumnFilter
                          column="description"
                          filterValue={columnFilters.description}
                          onFilterChange={handleColumnFilterChange}
                          onClearFilter={clearColumnFilter}
                        />
                      </div>
                    </th>
                    <th>
                      <div className="column-header">
                        Status
                        <div className="status-filter">
                          <select
                            value={columnFilters.is_active}
                            onChange={(e) => handleColumnFilterChange("is_active", e.target.value)}
                            className="status-filter-select"
                          >
                            <option value="">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                          {columnFilters.is_active && (
                            <button
                              className="clear-filter-btn"
                              onClick={() => clearColumnFilter("is_active")}
                              title="Clear filter"
                            >
                              ✕
                            </button>
                          )}
                        </div>
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
                  {currentRoles.length > 0 ? (
                    currentRoles.map((role) => (
                      <tr key={role.id}>
                        <td className="role-name-cell">
                          <div className="role-avatar">
                            {role.role_name.charAt(0).toUpperCase()}
                          </div>
                          {role.role_name}
                        </td>
                        <td className="description-cell">
                          {role.description}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              role.is_active ? "active" : "inactive"
                            }`}
                          >
                            {role.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          {new Date(role.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="action-btn edit-btn"
                              onClick={() => handleEditRole(role)}
                              title="Edit Role"
                            >
                              ✏️
                            </button>

                            <button
                              className={`action-btn ${role.is_active ? "deactivate-btn" : "activate-btn"}`}
                              onClick={() => handleToggleStatus(role)}
                              title={role.is_active ? "Deactivate Role" : "Activate Role"}
                            >
                              {role.is_active ? "⏸️" : "▶️"}
                            </button>

                            <button
                              className="action-btn delete-btn"
                              onClick={() => handleDeleteRole(role)}
                              title="Delete Role"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    // Show empty row when no data
                    <tr className="empty-row">
                      <td colSpan="5" className="empty-state-cell">
                        <div className="empty-state">
                          {hasActiveFilters ? (
                            <>
                              <p>No roles found matching your current filters.</p>
                              <button 
                                className="clear-filters-inline"
                                onClick={clearAllFilters}
                              >
                                Clear all filters
                              </button>
                            </>
                          ) : (
                            <p>No roles available in the system.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {totalPages > 1 && filteredRoles.length > 0 && (
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

        {/* Custom confirm dialog */}
        {confirmDialog.isOpen && (
          <ConfirmDialog
            title="Confirm Deactivation"
            message={`Are you sure you want to deactivate role "${confirmDialog.role.role_name}"? This role will not be available for new user assignments.`}
            onConfirm={confirmDeleteRole}
            onCancel={cancelDeleteRole}
          />
        )}
      </div>
    </div>
  );
};

export default RoleManagementPage;