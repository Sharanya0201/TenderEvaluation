import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus
} from "../api/auth";
import UserForm from "../components/UserForm";
import { useSidebar } from "../context/SidebarContext";
import "../styles/UserManagement.css";
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
  <div className="ump-column-filter">
    <input
      type="text"
      placeholder={`Filter ${column}...`}
      value={filterValue}
      onChange={(e) => onFilterChange(column, e.target.value)}
      className="ump-column-filter-input"
    />
    {filterValue && (
      <button
        className="ump-clear-filter-btn"
        onClick={() => onClearFilter(column)}
        title="Clear filter"
      >
        ✕
      </button>
    )}
  </div>
);

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [exportLoading, setExportLoading] = useState(false);
  const { isCollapsed } = useSidebar();

  // Column filters state
  const [columnFilters, setColumnFilters] = useState({
    username: "",
    email: "",
    mobile_number: "",
    role_name: "",
    is_active: "",
    created_at: ""
  });

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    user: null
  });

  const tableRef = useRef();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await getUsers();
      if (response.success) {
        setUsers(response.users || []);
      } else {
        toast.error("Failed to load users");
      }
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Error loading users");
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
      username: "",
      email: "",
      mobile_number: "",
      role_name: "",
      is_active: "",
      created_at: ""
    });
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Apply all filters
  const filteredUsers = users.filter((user) => {
    // Global search filter
    const globalSearchMatch = 
      searchTerm === "" ||
      (user.username?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user.mobile_number || "").includes(searchTerm) ||
      (user.role_name?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    // Column-wise filters
    const usernameMatch = 
      columnFilters.username === "" ||
      (user.username?.toLowerCase() || "").includes(columnFilters.username.toLowerCase());

    const emailMatch = 
      columnFilters.email === "" ||
      (user.email?.toLowerCase() || "").includes(columnFilters.email.toLowerCase());

    const mobileMatch = 
      columnFilters.mobile_number === "" ||
      (user.mobile_number || "").includes(columnFilters.mobile_number);

    const roleMatch = 
      columnFilters.role_name === "" ||
      (user.role_name?.toLowerCase() || "").includes(columnFilters.role_name.toLowerCase());

    const statusMatch = 
      columnFilters.is_active === "" ||
      (columnFilters.is_active === "active" && user.is_active) ||
      (columnFilters.is_active === "inactive" && !user.is_active);

    const dateMatch = 
      columnFilters.created_at === "" ||
      new Date(user.created_at).toLocaleDateString().includes(columnFilters.created_at);

    return globalSearchMatch && usernameMatch && emailMatch && mobileMatch && 
           roleMatch && statusMatch && dateMatch;
  });

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // Check if any filters are active
  const hasActiveFilters = searchTerm !== "" || Object.values(columnFilters).some(filter => filter !== "");

  const handleAddUser = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDeleteUser = (user) => {
    setConfirmDialog({
      isOpen: true,
      user
    });
  };

  const confirmDeleteUser = async () => {
    const user = confirmDialog.user;
    if (!user) return;

    try {
      const response = await deleteUser(user.id);
      if (response.success) {
        toast.success("User deactivated successfully");
        loadUsers();
      } else {
        toast.error(response.message || "Failed to deactivate user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Error deactivating user");
    } finally {
      setConfirmDialog({ isOpen: false, user: null });
    }
  };

  const cancelDeleteUser = () =>
    setConfirmDialog({ isOpen: false, user: null });

  const handleToggleStatus = async (user) => {
    const newStatus = !user.is_active;
    try {
      const response = await toggleUserStatus(user.id, newStatus);
      if (response.success) {
        toast.success(
          `User ${newStatus ? "activated" : "deactivated"} successfully`
        );
        loadUsers();
      } else {
        toast.error(response.message || "Failed to update user status");
      }
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Error updating user status");
    }
  };

  const handleFormSubmit = async (userData) => {
    try {
      let response;
      if (editingUser) {
        response = await updateUser(editingUser.id, userData);
      } else {
        response = await createUser(userData);
      }

      if (response.success) {
        toast.success(
          editingUser ? "User updated successfully" : "User created successfully"
        );
        setShowForm(false);
        setEditingUser(null);
        loadUsers();
      } else {
        toast.error(
          response.message ||
            `Failed to ${editingUser ? "update" : "create"} user`
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(`Error ${editingUser ? "updating" : "creating"} user`);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Export to Excel function
  const exportToExcel = () => {
    setExportLoading(true);
    try {
      const dataToExport = filteredUsers.map(user => ({
        'Username': user.username || '',
        'Email': user.email || '',
        'Mobile Number': user.mobile_number || '',
        'Role': user.role_name || '',
        'Status': user.is_active ? 'Active' : 'Inactive',
        'Created Date': new Date(user.created_at).toLocaleDateString(),
        'Last Login': user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
      
      // Auto-size columns
      const colWidths = [
        { wch: 15 }, // Username
        { wch: 25 }, // Email
        { wch: 15 }, // Mobile Number
        { wch: 12 }, // Role
        { wch: 10 }, // Status
        { wch: 12 }, // Created Date
        { wch: 12 }  // Last Login
      ];
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, `users_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Users exported to Excel successfully');
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
        title: 'User Management Report',
        subject: 'Users Export',
        author: 'Tender Management System'
      });

      // Add title
      doc.setFontSize(16);
      doc.setTextColor(44, 62, 80);
      doc.setFont("helvetica", "bold");
      doc.text("User Management Report", 105, 15, { align: "center" });

      // Add date
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 22, { align: "center" });

      // Add summary
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Users: ${filteredUsers.length}`, 14, 32);
      doc.text(`Active Users: ${filteredUsers.filter(u => u.is_active).length}`, 14, 38);

      // Add table headers
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(12, 109, 197);
      
      // Header positions
      const headerY = 50;
      doc.rect(14, headerY, 25, 8, 'F');
      doc.rect(39, headerY, 45, 8, 'F');
      doc.rect(84, headerY, 25, 8, 'F');
      doc.rect(109, headerY, 25, 8, 'F');
      doc.rect(134, headerY, 20, 8, 'F');
      doc.rect(154, headerY, 25, 8, 'F');
      
      // Header text
      doc.text("Username", 16, headerY + 6);
      doc.text("Email", 41, headerY + 6);
      doc.text("Mobile", 86, headerY + 6);
      doc.text("Role", 111, headerY + 6);
      doc.text("Status", 136, headerY + 6);
      doc.text("Created", 156, headerY + 6);

      // Add table data
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      
      let currentY = headerY + 16;
      
      filteredUsers.forEach((user, index) => {
        // Check for page break
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
          
          // Redraw headers on new page
          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 255, 255);
          doc.setFillColor(12, 109, 197);
          doc.rect(14, currentY, 25, 8, 'F');
          doc.rect(39, currentY, 45, 8, 'F');
          doc.rect(84, currentY, 25, 8, 'F');
          doc.rect(109, currentY, 25, 8, 'F');
          doc.rect(134, currentY, 20, 8, 'F');
          doc.rect(154, currentY, 25, 8, 'F');
          doc.text("Username", 16, currentY + 6);
          doc.text("Email", 41, currentY + 6);
          doc.text("Mobile", 86, currentY + 6);
          doc.text("Role", 111, currentY + 6);
          doc.text("Status", 136, currentY + 6);
          doc.text("Created", 156, currentY + 6);
          
          currentY += 16;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);
        }

        // Alternate row background
        if (index % 2 === 0) {
          doc.setFillColor(245, 247, 250);
          doc.rect(14, currentY - 4, 165, 8, 'F');
        }

        // User data
        doc.text(user.username || 'N/A', 16, currentY);
        
        // Truncate email if too long
        let email = user.email || 'N/A';
        if (email.length > 25) {
          email = email.substring(0, 22) + '...';
        }
        doc.text(email, 41, currentY);
        
        doc.text(user.mobile_number || 'N/A', 86, currentY);
        doc.text(user.role_name || 'N/A', 111, currentY);
        doc.text(user.is_active ? 'Active' : 'Inactive', 136, currentY);
        doc.text(new Date(user.created_at).toLocaleDateString(), 156, currentY);
        
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
      doc.save(`users_export_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Users exported to PDF successfully');
      
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
            className="ump-modal-backdrop"
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
            className="ump-modal-container"
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
            <div className="ump-modal-content">
              <UserForm
                user={editingUser}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
                isEditing={!!editingUser}
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
              User Management
            </h1>
            <p style={{ margin: "0.5rem 0 0", color: "#7f8c8d" }}>
              Manage system users and their permissions
            </p>
          </div>
        </div>

        <div className="ump-user-management-actions">
          <div className="ump-search-box">
            <input
              type="text"
              placeholder="Search all users..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="ump-search-input"
            />
            <span className="ump-search-icon">🔍</span>
          </div>
          
          <div className="ump-export-buttons-container">
            {hasActiveFilters && (
              <button 
                className="ump-clear-filters-button"
                onClick={clearAllFilters}
                title="Clear all filters"
              >
                🗑️ Clear Filters
              </button>
            )}
            <button 
              className="ump-export-button ump-export-excel" 
              onClick={exportToExcel}
              disabled={exportLoading || filteredUsers.length === 0}
            >
              {exportLoading ? 'Exporting...' : '📊 Export Excel'}
            </button>
            <button 
              className="ump-export-button ump-export-pdf" 
              onClick={exportToPDF}
              disabled={exportLoading || filteredUsers.length === 0}
            >
              {exportLoading ? 'Exporting...' : '📄 Export PDF'}
            </button>
            <button className="ump-add-user-button" onClick={handleAddUser}>
              + Add User
            </button>
          </div>
        </div>

        <div className="ump-users-table-container" ref={tableRef}>
          {loading ? (
            <div className="ump-loading-state">Loading users...</div>
          ) : (
            <>
              <div className="ump-table-info">
                {filteredUsers.length > 0 ? (
                  <>
                    Showing {indexOfFirstUser + 1}-{Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
                    {hasActiveFilters && (
                      <span className="ump-filter-indicator">
                        (Filtered from {users.length} total users)
                      </span>
                    )}
                  </>
                ) : (
                  <div className="ump-empty-table-info">
                    {hasActiveFilters ? "No users found matching your filters" : "No users available"}
                    {hasActiveFilters && (
                      <button 
                        className="ump-clear-filters-inline"
                        onClick={clearAllFilters}
                      >
                        Clear filters to see all users
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Always show table headers with filters */}
              <table className="ump-users-table">
                <thead>
                  <tr>
                    <th>
                      <div className="ump-column-header">
                        Username
                        <ColumnFilter
                          column="username"
                          filterValue={columnFilters.username}
                          onFilterChange={handleColumnFilterChange}
                          onClearFilter={clearColumnFilter}
                        />
                      </div>
                    </th>
                    <th>
                      <div className="ump-column-header">
                        Email
                        <ColumnFilter
                          column="email"
                          filterValue={columnFilters.email}
                          onFilterChange={handleColumnFilterChange}
                          onClearFilter={clearColumnFilter}
                        />
                      </div>
                    </th>
                    <th>
                      <div className="ump-column-header">
                        Mobile
                        <ColumnFilter
                          column="mobile_number"
                          filterValue={columnFilters.mobile_number}
                          onFilterChange={handleColumnFilterChange}
                          onClearFilter={clearColumnFilter}
                        />
                      </div>
                    </th>
                    <th>
                      <div className="ump-column-header">
                        Role
                        <ColumnFilter
                          column="role_name"
                          filterValue={columnFilters.role_name}
                          onFilterChange={handleColumnFilterChange}
                          onClearFilter={clearColumnFilter}
                        />
                      </div>
                    </th>
                    <th>
                      <div className="ump-column-header">
                        Status
                        <div className="ump-status-filter">
                          <select
                            value={columnFilters.is_active}
                            onChange={(e) => handleColumnFilterChange("is_active", e.target.value)}
                            className="ump-status-filter-select"
                          >
                            <option value="">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                          {columnFilters.is_active && (
                            <button
                              className="ump-clear-filter-btn"
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
                      <div className="ump-column-header">
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
                  {currentUsers.length > 0 ? (
                    currentUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="ump-username-cell">
                          <div className="ump-user-avatar">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          {user.username}
                        </td>
                        <td>{user.email}</td>
                        <td>{user.mobile_number}</td>
                        <td>
                          <span
                            className={`ump-role-badge ump-role-${user.role_name?.toLowerCase()}`}
                          >
                            {user.role_name}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`ump-status-badge ${
                              user.is_active ? "active" : "inactive"
                            }`}
                          >
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="ump-action-buttons">
                            <button
                              className="ump-action-btn ump-edit-btn"
                              onClick={() => handleEditUser(user)}
                              title="Edit User"
                            >
                              ✏️
                            </button>
                            <button
                              className="ump-action-btn ump-status-btn"
                              onClick={() => handleToggleStatus(user)}
                              title={
                                user.is_active ? "Deactivate" : "Activate"
                              }
                            >
                              {user.is_active ? "⏸️" : "▶️"}
                            </button>
                            <button
                              className="ump-action-btn ump-delete-btn"
                              onClick={() => handleDeleteUser(user)}
                              title="Delete User"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    // Show empty row when no data
                    <tr className="ump-empty-row">
                      <td colSpan="7" className="ump-empty-state-cell">
                        <div className="ump-empty-state">
                          {hasActiveFilters ? (
                            <>
                              <p>No users found matching your current filters.</p>
                              <button 
                                className="ump-clear-filters-inline"
                                onClick={clearAllFilters}
                              >
                                Clear all filters
                              </button>
                            </>
                          ) : (
                            <p>No users available in the system.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {totalPages > 1 && filteredUsers.length > 0 && (
                <div className="ump-pagination">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="ump-pagination-btn"
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => paginate(page)}
                        className={`ump-pagination-btn ${
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
                    className="ump-pagination-btn"
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
            message={`Are you sure you want to deactivate user "${confirmDialog.user.username}"? Their data will remain in the system.`}
            onConfirm={confirmDeleteUser}
            onCancel={cancelDeleteUser}
          />
        )}
      </div>
    </div>
  );
};

export default UserManagementPage;