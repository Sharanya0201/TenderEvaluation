import { useState, useRef, useEffect } from "react";
import { getRoles } from "../api/auth";
import "../styles/UserForm.css";

const UserForm = ({ user, onSubmit, onCancel, isEditing = false }) => {
  const [formData, setFormData] = useState({
    username: "",
    mobile_number: "",
    email: "",
    role_id: "",
    password: "",
    confirm_password: ""
  });
  const [errors, setErrors] = useState({
    username: "",
    mobile_number: "",
    email: "",
    role_id: "",
    password: "",
    confirm_password: ""
  });
  const [touched, setTouched] = useState({
    username: false,
    mobile_number: false,
    email: false,
    role_id: false,
    password: false,
    confirm_password: false
  });
  const [roles, setRoles] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load roles and populate form if editing
  useEffect(() => {
    loadRoles();
    if (isEditing && user) {
      setFormData({
        username: user.username || "",
        mobile_number: user.mobile_number || "",
        email: user.email || "",
        role_id: user.role_id || "",
        password: "",
        confirm_password: ""
      });
    }
  }, [user, isEditing]);

  const loadRoles = async () => {
    try {
      const response = await getRoles();
      if (response.success) {
        setRoles(response.roles || []);
      }
    } catch (error) {
      console.error("Failed to load roles:", error);
    }
  };

  const validateField = (name, value) => {
  switch (name) {
    case 'username':
      if (!value.trim()) return 'Username is required';
      if (value.length < 3) return 'Username must be at least 3 characters';
      if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
      return '';

    case 'mobile_number':
      // Only validate if value is provided
      if (value && !/^[0-9]{10}$/.test(value)) return 'Mobile number must be 10 digits';
      return '';

    case 'email':
      if (!value.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
      return '';

    case 'role_id':
      if (!value) return 'Role is required';
      return '';

    case 'password':
      if (!isEditing && !value) return 'Password is required';
      if (value && value.length < 6) return 'Password must be at least 6 characters';
      return '';

    case 'confirm_password':
      if (formData.password && value !== formData.password) return 'Passwords do not match';
      return '';

    default:
      return '';
  }
};
  

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const validateForm = () => {
    const newErrors = {
      username: validateField('username', formData.username),
      mobile_number: validateField('mobile_number', formData.mobile_number),
      email: validateField('email', formData.email),
      role_id: validateField('role_id', formData.role_id),
      password: validateField('password', formData.password),
      confirm_password: validateField('confirm_password', formData.confirm_password)
    };

    setErrors(newErrors);
    setTouched({
      username: true,
      mobile_number: true,
      email: true,
      role_id: true,
      password: true,
      confirm_password: true
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
      role_id: parseInt(formData.role_id) // Ensure it's a number
    };
    delete submitData.confirm_password;

    if (isEditing && !submitData.password) {
      delete submitData.password;
    }

    console.log('Submitting user data:', submitData); // Debug log
    
    await onSubmit(submitData);
  } catch (error) {
    console.error("Form submission failed:", error);
  } finally {
    setIsSubmitting(false);
  }
};


  const hasErrors = Object.values(errors).some(error => error !== '');

  return (
    <div className="uf-user-form-container">
      <div className="uf-user-form-header">
        <h2>{isEditing ? 'Edit User' : 'Add New User'}</h2>
        <p>{isEditing ? 'Update user information' : 'Create a new user account'}</p>
      </div>
      
      <form className="uf-user-form" onSubmit={handleSubmit} noValidate>
        <div className="uf-form-row">
          <div className="uf-form-group">
            <label htmlFor="username">Username *</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter username"
              required
              autoComplete="username"
              className={touched.username && errors.username ? 'uf-error' : ''}
              disabled={isEditing}
            />
            {touched.username && errors.username && (
              <span className="uf-error-message">{errors.username}</span>
            )}
          </div>

          <div className="uf-form-group">
            <label htmlFor="mobile_number">Mobile Number *</label>
            <input
              type="tel"
              id="mobile_number"
              name="mobile_number"
              value={formData.mobile_number}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter 10-digit mobile number"
              required
              autoComplete="tel"
              className={touched.mobile_number && errors.mobile_number ? 'uf-error' : ''}
            />
            {touched.mobile_number && errors.mobile_number && (
              <span className="uf-error-message">{errors.mobile_number}</span>
            )}
          </div>
        </div>

        <div className="uf-form-group">
          <label htmlFor="email">Email ID *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter email address"
            required
            autoComplete="email"
            className={touched.email && errors.email ? 'uf-error' : ''}
          />
          {touched.email && errors.email && (
            <span className="uf-error-message">{errors.email}</span>
          )}
        </div>

        <div className="uf-form-group">
          <label htmlFor="role_id">Role *</label>
          <select
            id="role_id"
            name="role_id"
            value={formData.role_id}
            onChange={handleChange}
            onBlur={handleBlur}
            required
            className={touched.role_id && errors.role_id ? 'uf-error' : ''}
          >
            <option value="">Select Role</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>
                {role.role_name}
              </option>
            ))}
          </select>
          {touched.role_id && errors.role_id && (
            <span className="uf-error-message">{errors.role_id}</span>
          )}
        </div>

        <div className="uf-form-row">
          <div className="uf-form-group uf-password-group">
            <label htmlFor="password">
              Password {!isEditing && '*'}
              {isEditing && <span className="uf-optional">(Leave blank to keep current)</span>}
            </label>
            <div className="uf-password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={isEditing ? "Enter new password" : "Enter password"}
                required={!isEditing}
                autoComplete="new-password"
                className={`uf-password-input ${touched.password && errors.password ? 'uf-error' : ''}`}
              />
              <button 
                type="button"
                className="uf-password-toggle"
                onClick={togglePasswordVisibility}
                tabIndex={-1}
              >
                <i className="material-icons">
                  {showPassword ? "visibility" : "visibility_off"}
                </i>
              </button>
            </div>
            {touched.password && errors.password && (
              <span className="uf-error-message">{errors.password}</span>
            )}
          </div>

          <div className="uf-form-group uf-password-group">
            <label htmlFor="confirm_password">
              Confirm Password {formData.password && '*'}
            </label>
            <div className="uf-password-input-container">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirm_password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Confirm password"
                required={!!formData.password}
                autoComplete="new-password"
                className={`uf-password-input ${touched.confirm_password && errors.confirm_password ? 'uf-error' : ''}`}
              />
              <button 
                type="button"
                className="uf-password-toggle"
                onClick={toggleConfirmPasswordVisibility}
                tabIndex={-1}
              >
                <i className="material-icons">
                  {showConfirmPassword ? "visibility" : "visibility_off"}
                </i>
              </button>
            </div>
            {touched.confirm_password && errors.confirm_password && (
              <span className="uf-error-message">{errors.confirm_password}</span>
            )}
          </div>
        </div>

        <div className="uf-form-actions">
          <button 
            type="button" 
            className="uf-cancel-button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className={`uf-submit-button ${isSubmitting ? 'uf-submitting' : ''}`}
            disabled={isSubmitting || hasErrors}
          >
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update User' : 'Add User')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;
