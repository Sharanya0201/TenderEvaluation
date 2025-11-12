import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useSidebar } from '../context/SidebarContext';

import {
  getEvaluationCriteria,
  createEvaluationCriterion,
  updateEvaluationCriterion,
  deleteEvaluationCriterion,
  toggleCriterionStatus
} from '../api/auth';
import '../styles/EvaluationCriteria.css';

const EvaluationCriteriaManagement = () => {
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    weightage: '',
    max_score: '',
    category: '',
    is_active: true
  });
  const [formErrors, setFormErrors] = useState({});

  const { isCollapsed } = useSidebar();

  // Load criteria from backend API
  useEffect(() => {
    loadCriteria();
  }, []);

  const loadCriteria = async () => {
    setLoading(true);
    try {
      const response = await getEvaluationCriteria({ active_only: false });
      if (response.success) {
        // Filter out any default/system criteria, only show user-created ones
        const userCriteria = (response.criteria || []).filter(criterion => criterion.is_custom);
        setCriteria(userCriteria);
      } else {
        throw new Error(response.message || 'Failed to load criteria');
      }
    } catch (error) {
      console.error('Error loading criteria:', error);
      toast.error('Failed to load evaluation criteria');
      setCriteria([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingCriterion(null);
    setFormData({
      name: '',
      description: '',
      weightage: '',
      max_score: '',
      category: '',
      is_active: true
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleEdit = (criterion) => {
    setEditingCriterion(criterion);
    setFormData({
      name: criterion.name,
      description: criterion.description,
      weightage: criterion.weightage,
      max_score: criterion.max_score,
      category: criterion.category,
      is_active: criterion.is_active
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleDelete = async (criterion) => {
    if (window.confirm(`Are you sure you want to delete "${criterion.name}"? This action cannot be undone.`)) {
      try {
        const response = await deleteEvaluationCriterion(criterion.id);
        if (response.success) {
          toast.success('Criterion deleted successfully');
          await loadCriteria(); // Reload criteria from backend
        } else {
          throw new Error(response.message || 'Failed to delete criterion');
        }
      } catch (error) {
        console.error('Error deleting criterion:', error);
        toast.error(error.message || 'Failed to delete criterion');
      }
    }
  };

  const handleToggleStatus = async (criterion) => {
    try {
      const response = await toggleCriterionStatus(criterion.id, !criterion.is_active);
      if (response.success) {
        toast.success(`Criterion ${!criterion.is_active ? 'activated' : 'deactivated'} successfully`);
        await loadCriteria(); // Reload criteria from backend
      } else {
        throw new Error(response.message || 'Failed to update criterion status');
      }
    } catch (error) {
      console.error('Error toggling criterion status:', error);
      toast.error(error.message || 'Failed to update criterion status');
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Criterion name is required';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Criterion name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    if (!formData.weightage || formData.weightage <= 0) {
      errors.weightage = 'Weightage must be greater than 0';
    } else if (formData.weightage > 100) {
      errors.weightage = 'Weightage cannot exceed 100';
    }

    if (!formData.max_score || formData.max_score <= 0) {
      errors.max_score = 'Max score must be greater than 0';
    } else if (formData.max_score > 1000) {
      errors.max_score = 'Max score cannot exceed 1000';
    }

    if (!formData.category.trim()) {
      errors.category = 'Category is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const criterionData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        weightage: parseFloat(formData.weightage),
        max_score: parseFloat(formData.max_score),
        category: formData.category.trim(),
        is_active: formData.is_active,
        is_custom: true
      };

      let response;
      if (editingCriterion) {
        response = await updateEvaluationCriterion(editingCriterion.id, criterionData);
        toast.success('Criterion updated successfully');
      } else {
        response = await createEvaluationCriterion(criterionData);
        toast.success('Criterion added successfully');
      }

      if (response.success) {
        setShowForm(false);
        setEditingCriterion(null);
        await loadCriteria(); // Reload criteria from backend
      } else {
        throw new Error(response.message || 'Failed to save criterion');
      }
    } catch (error) {
      console.error('Error saving criterion:', error);
      toast.error(error.message || 'Failed to save criterion');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCriterion(null);
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Filter criteria based on search, category, and status
  const filteredCriteria = criteria.filter(criterion => {
    const matchesSearch = criterion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         criterion.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         criterion.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || criterion.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && criterion.is_active) ||
                         (filterStatus === 'inactive' && !criterion.is_active);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Get unique categories for filter (only from user-created criteria)
  const categories = ['all', ...new Set(criteria.map(c => c.category))];

  // Calculate total weightage
  const totalWeightage = criteria.reduce((sum, criterion) => sum + criterion.weightage, 0);

  // Count active/inactive criteria
  const activeCriteriaCount = criteria.filter(c => c.is_active).length;
  const customCriteriaCount = criteria.filter(c => c.is_custom).length;

  if (loading) {
    return (
      <div className="ec-container">
        
        <div className={`ec-main-content ${isCollapsed ? 'ec-collapsed' : 'ec-expanded'}`}>
          <div className="ec-loading">
            <div className="ec-loading-spinner"></div>
            <p>Loading evaluation criteria...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ec-container">
      
      
      <div className={`ec-main-content ${isCollapsed ? 'ec-collapsed' : 'ec-expanded'}`}>
        {/* Header Section */}
        <div className="ec-header">
          <div className="ec-header-content">
            <h1 className="ec-title">Evaluation Criteria Management</h1>
            <p className="ec-subtitle">
              Manage and configure your custom evaluation criteria for tender assessment
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="ec-stats">
          <div className="ec-stat-card">
            <div className="ec-stat-icon">📊</div>
            <div className="ec-stat-content">
              <div className="ec-stat-value">{criteria.length}</div>
              <div className="ec-stat-label">Your Criteria</div>
            </div>
          </div>
          <div className="ec-stat-card">
            <div className="ec-stat-icon">⚖️</div>
            <div className="ec-stat-content">
              <div className="ec-stat-value">{totalWeightage.toFixed(1)}%</div>
              <div className="ec-stat-label">Total Weightage</div>
            </div>
          </div>
          <div className="ec-stat-card">
            <div className="ec-stat-icon">✅</div>
            <div className="ec-stat-content">
              <div className="ec-stat-value">{activeCriteriaCount}</div>
              <div className="ec-stat-label">Active Criteria</div>
            </div>
          </div>
          <div className="ec-stat-card">
            <div className="ec-stat-icon">🔧</div>
            <div className="ec-stat-content">
              <div className="ec-stat-value">{customCriteriaCount}</div>
              <div className="ec-stat-label">Custom Criteria</div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="ec-actions">
          <div className="ec-search-filter">
            <div className="ec-search">
              <input
                type="text"
                placeholder="Search your criteria by name, description, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ec-search-input"
              />
              <span className="ec-search-icon">🔍</span>
            </div>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="ec-filter-select"
            >
              <option value="all">All Categories</option>
              {categories.filter(cat => cat !== 'all').map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="ec-filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          <div className="ec-action-buttons">
            <button
              onClick={handleAddNew}
              className="ec-add-btn"
            >
              <span className="ec-btn-icon">+</span>
              Add New Criteria
            </button>
          </div>
        </div>

        {/* Criteria List */}
        <div className="ec-content">
          {filteredCriteria.length === 0 ? (
            <div className="ec-empty-state">
              <div className="ec-empty-icon">📝</div>
              <h3>No Evaluation Criteria Found</h3>
              <p>
                {searchTerm || filterCategory !== 'all' || filterStatus !== 'all'
                  ? 'No criteria match your search filters. Try adjusting your search criteria.'
                  : 'You haven\'t created any evaluation criteria yet. Get started by adding your first criterion for tender evaluations.'
                }
              </p>
              <button
                onClick={handleAddNew}
                className="ec-add-btn ec-add-btn-empty"
              >
                + Add Your First Criteria
              </button>
            </div>
          ) : (
            <div className="ec-criteria-grid">
              {filteredCriteria.map(criterion => (
                <div key={criterion.id} className={`ec-criterion-card ${!criterion.is_active ? 'ec-inactive' : ''}`}>
                  <div className="ec-criterion-header">
                    <h3 className="ec-criterion-name">{criterion.name}</h3>
                    <div className="ec-criterion-badges">
                      {!criterion.is_active && (
                        <span className="ec-badge ec-badge-inactive">Inactive</span>
                      )}
                      <span className="ec-badge ec-badge-custom">Custom</span>
                      <span className="ec-badge ec-badge-category">
                        {criterion.category}
                      </span>
                    </div>
                  </div>
                  
                  <p className="ec-criterion-description">
                    {criterion.description}
                  </p>
                  
                  <div className="ec-criterion-metrics">
                    <div className="ec-metric">
                      <span className="ec-metric-label">Weightage:</span>
                      <span className="ec-metric-value ec-weightage">
                        {criterion.weightage}%
                      </span>
                    </div>
                    <div className="ec-metric">
                      <span className="ec-metric-label">Max Score:</span>
                      <span className="ec-metric-value ec-maxscore">
                        {criterion.max_score}
                      </span>
                    </div>
                  </div>

                  <div className="ec-criterion-footer">
                    <div className="ec-criterion-info">
                      {criterion.created_at && (
                        <span className="ec-info-text">
                          Created: {new Date(criterion.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    
                    <div className="ec-criterion-actions">
                      <button
                        onClick={() => handleToggleStatus(criterion)}
                        className={`ec-action-btn ec-status-btn ${criterion.is_active ? 'ec-deactivate' : 'ec-activate'}`}
                        title={criterion.is_active ? 'Deactivate Criterion' : 'Activate Criterion'}
                      >
                        {criterion.is_active ? '⏸️' : '▶️'}
                      </button>
                      <button
                        onClick={() => handleEdit(criterion)}
                        className="ec-action-btn ec-edit-btn"
                        title="Edit Criterion"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(criterion)}
                        className="ec-action-btn ec-delete-btn"
                        title="Delete Criterion"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="ec-modal-overlay" onClick={handleCancel}>
            <div className="ec-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ec-modal-header">
                <h2>
                  {editingCriterion ? 'Edit Evaluation Criterion' : 'Add New Evaluation Criterion'}
                </h2>
                <button
                  onClick={handleCancel}
                  className="ec-modal-close"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="ec-form">
                <div className="ec-form-group">
                  <label htmlFor="name" className="ec-form-label">
                    Criterion Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`ec-form-input ${formErrors.name ? 'ec-error' : ''}`}
                    placeholder="e.g., Technical Expertise, Financial Stability"
                  />
                  {formErrors.name && (
                    <span className="ec-error-message">{formErrors.name}</span>
                  )}
                </div>

                <div className="ec-form-group">
                  <label htmlFor="description" className="ec-form-label">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className={`ec-form-textarea ${formErrors.description ? 'ec-error' : ''}`}
                    placeholder="Describe what this criterion evaluates and how it should be assessed..."
                  />
                  {formErrors.description && (
                    <span className="ec-error-message">{formErrors.description}</span>
                  )}
                </div>

                <div className="ec-form-row">
                  <div className="ec-form-group">
                    <label htmlFor="weightage" className="ec-form-label">
                      Weightage (%) *
                    </label>
                    <input
                      type="number"
                      id="weightage"
                      name="weightage"
                      value={formData.weightage}
                      onChange={handleInputChange}
                      min="1"
                      max="100"
                      step="0.1"
                      className={`ec-form-input ${formErrors.weightage ? 'ec-error' : ''}`}
                      placeholder="0-100"
                    />
                    {formErrors.weightage && (
                      <span className="ec-error-message">{formErrors.weightage}</span>
                    )}
                  </div>

                  <div className="ec-form-group">
                    <label htmlFor="max_score" className="ec-form-label">
                      Maximum Score *
                    </label>
                    <input
                      type="number"
                      id="max_score"
                      name="max_score"
                      value={formData.max_score}
                      onChange={handleInputChange}
                      min="1"
                      max="1000"
                      step="0.1"
                      className={`ec-form-input ${formErrors.max_score ? 'ec-error' : ''}`}
                      placeholder="1-1000"
                    />
                    {formErrors.max_score && (
                      <span className="ec-error-message">{formErrors.max_score}</span>
                    )}
                  </div>
                </div>

                <div className="ec-form-group">
                  <label htmlFor="category" className="ec-form-label">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`ec-form-input ${formErrors.category ? 'ec-error' : ''}`}
                  >
                    <option value="">Select a category</option>
                    <option value="Technical">Technical</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Experience">Experience</option>
                    <option value="Operational">Operational</option>
                    <option value="Quality">Quality</option>
                    <option value="Financial">Financial</option>
                    <option value="Compliance">Compliance</option>
                  </select>
                  {formErrors.category && (
                    <span className="ec-error-message">{formErrors.category}</span>
                  )}
                </div>

                <div className="ec-form-group ec-form-checkbox">
                  <label className="ec-checkbox-label">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="ec-checkbox"
                    />
                    <span className="ec-checkbox-text">Active for evaluations</span>
                  </label>
                  <small className="ec-checkbox-help">
                    Inactive criteria won't be available for tender evaluations
                  </small>
                </div>

                <div className="ec-form-actions">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="ec-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ec-submit-btn"
                  >
                    {editingCriterion ? 'Update Criterion' : 'Add Criterion'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationCriteriaManagement;