import { useState, useEffect } from "react";
import "../styles/RoleForm.css";

const RoleForm = ({ role, onSubmit, onCancel, isEditing = false }) => {
  const [formData, setFormData] = useState({
    role_name: "",
    description: "",
    is_active: true
  });
  const [errors, setErrors] = useState({
    role_name: "",
    description: ""
  });
  const [touched, setTouched] = useState({
    role_name: false,
    description: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form if editing
  useEffect(() => {
    if (isEditing && role) {
      setFormData({
        role_name: role.role_name || "",
        description: role.description || "",
        is_active: role.is_active !== undefined ? role.is_active : true
      });
    }
  }, [role, isEditing]);

  const validateField = (name, value) => {
    switch (name) {
      case 'role_name':
        if (!value.trim()) return 'Role name is required';
        if (value.length < 2) return 'Role name must be at least 2 characters';
        if (!/^[a-zA-Z\s]+$/.test(value)) return 'Role name can only contain letters and spaces';
        return '';

      case 'description':
        if (!value.trim()) return 'Description is required';
        if (value.length < 10) return 'Description must be at least 10 characters';
        return '';

      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    if (name === 'is_active') {
      // For radio buttons, convert string to boolean
      setFormData(prev => ({
        ...prev,
        [name]: value === 'true'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const validateForm = () => {
    const newErrors = {
      role_name: validateField('role_name', formData.role_name),
      description: validateField('description', formData.description)
    };

    setErrors(newErrors);
    setTouched({
      role_name: true,
      description: true
    });

    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const submitData = { 
        ...formData,
        role_name: formData.role_name.trim(),
        description: formData.description.trim()
      };

      console.log('Submitting role data:', submitData);
      
      await onSubmit(submitData);
    } catch (error) {
      console.error("Form submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasErrors = Object.values(errors).some(error => error !== '');

  return (
    <div className="role-form-container">
      <div className="role-form-header">
        <h2>{isEditing ? 'Edit Role' : 'Add New Role'}</h2>
        <p>{isEditing ? 'Update role information' : 'Create a new system role'}</p>
      </div>
      
      <form className="role-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="role_name">Role Name *</label>
          <input
            type="text"
            id="role_name"
            name="role_name"
            value={formData.role_name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter role name (e.g., Admin, Evaluator)"
            required
            autoComplete="off"
            className={touched.role_name && errors.role_name ? 'error' : ''}
          />
          {touched.role_name && errors.role_name && (
            <span className="error-message">{errors.role_name}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter role description and permissions"
            required
            rows="4"
            autoComplete="off"
            className={touched.description && errors.description ? 'error' : ''}
          />
          {touched.description && errors.description && (
            <span className="error-message">{errors.description}</span>
          )}
        </div>

        <div className="form-group">
          <label className="status-label">Status *</label>
          <div className="status-radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="is_active"
                value="true"
                checked={formData.is_active === true}
                onChange={handleChange}
                className="radio-input"
              />
              <span className="radio-custom"></span>
              <span className="radio-label">Active</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="is_active"
                value="false"
                checked={formData.is_active === false}
                onChange={handleChange}
                className="radio-input"
              />
              <span className="radio-custom"></span>
              <span className="radio-label">Inactive</span>
            </label>
          </div>
          <p className="status-help">
            {formData.is_active 
              ? 'Active roles can be assigned to users.' 
              : 'Inactive roles cannot be assigned to new users.'
            }
          </p>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className={`submit-button ${isSubmitting ? 'submitting' : ''}`}
            disabled={isSubmitting || hasErrors}
          >
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Role' : 'Add Role')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RoleForm;