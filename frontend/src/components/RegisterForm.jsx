import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "Viewer" // Fixed role
  });
  const [errors, setErrors] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Validation rules
  const validateField = (name, value, allValues = formData) => {
    switch (name) {
      case 'username':
        if (!value.trim()) return 'User Name is required';
        if (value.length < 3) return 'User Name must be at least 3 characters';
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'User Name can only contain letters, numbers, and underscores';
        return '';
      
      case 'email':
        if (!value.trim()) return 'Email Address is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        return '';
      
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
        return '';
      
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== allValues.password) return 'Passwords do not match';
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

    if (name === 'password' && touched.confirmPassword) {
      const confirmPasswordError = validateField('confirmPassword', formData.confirmPassword, { ...formData, password: value });
      setErrors(prev => ({
        ...prev,
        confirmPassword: confirmPasswordError
      }));
    }
  };

  // Combined blur handler for validation and styling
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

    e.target.style.borderColor = error ? '#e74c3c' : '#e1e5e9';
    e.target.style.boxShadow = "none";
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = "#00bcd4";
    e.target.style.boxShadow = "0 0 0 3px rgba(0, 188, 212, 0.1)";
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
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
      confirmPassword: validateField('confirmPassword', formData.confirmPassword)
    };

    setErrors(newErrors);
    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true
    });

    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    // Ensure the role is always Viewer
    const userData = { ...formData, role: "Viewer" };

    try {
      await register(userData);

      toast.success("Registration successful! Please log in.", {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });

      setTimeout(() => navigate("/login"), 2500);
    } catch (error) {
      console.error("Registration failed:", error);

      toast.error(
        error.message || "Email already exists. Please use a different email.",
        {
          position: "top-center",
          autoClose: 3000,
        }
      );

      setErrors(prev => ({
        ...prev,
        email: "Email already exists. Please use a different email.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasErrors = Object.values(errors).some(error => error !== '');

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #0c2461 0%, #1e3799 50%, #0c6dc5 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <div style={{
        background: "rgba(255, 255, 255, 0.95)",
        borderRadius: "20px",
        padding: "3rem",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        width: "100%",
        maxWidth: "480px",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Decorative Elements */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          background: "linear-gradient(90deg, #00bcd4, #0097a7)"
        }}></div>
        
        <div style={{
          position: "absolute",
          top: "-50px",
          right: "-50px",
          width: "150px",
          height: "150px",
          background: "linear-gradient(135deg, rgba(0, 188, 212, 0.1) 0%, rgba(0, 151, 167, 0.1) 100%)",
          borderRadius: "50%"
        }}></div>

        <div style={{
          position: "absolute",
          bottom: "-30px",
          left: "-30px",
          width: "100px",
          height: "100px",
          background: "linear-gradient(135deg, rgba(30, 55, 153, 0.1) 0%, rgba(12, 36, 97, 0.1) 100%)",
          borderRadius: "50%"
        }}></div>

        {/* Header */}
        <div style={{
          textAlign: "center",
          marginBottom: "2rem",
          position: "relative",
          zIndex: 2
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #00bcd4, #0097a7)",
            borderRadius: "12px",
            padding: "12px",
            marginBottom: "1rem"
          }}>
            <span style={{
              color: "#fff",
              fontSize: "1.5rem",
              fontWeight: "bold"
            }}>🚀</span>
          </div>
          <h1 style={{
            margin: "0.5rem 0 0.25rem 0",
            fontSize: "1.8rem",
            fontWeight: "700",
            background: "linear-gradient(135deg, #0c2461, #1e3799)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            AI Tender
          </h1>
          <p style={{
            margin: 0,
            color: "#666",
            fontSize: "1rem",
            fontWeight: "500"
          }}>
            Create Your Account
          </p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} noValidate style={{
          position: "relative",
          zIndex: 2
        }}>
          {/* Username Field */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="username" style={{
              display: "block",
              marginBottom: "0.5rem",
              color: "#333",
              fontWeight: "600",
              fontSize: "0.9rem"
            }}>
              User Name *
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={handleFocus}
              required
              autoComplete="username"
              placeholder="Enter your user name"
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: `2px solid ${touched.username && errors.username ? '#e74c3c' : '#e1e5e9'}`,
                borderRadius: "10px",
                fontSize: "1rem",
                transition: "all 0.3s ease",
                background: "#fff",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
            {touched.username && errors.username && (
              <span style={{
                display: "block",
                color: "#e74c3c",
                fontSize: "0.8rem",
                marginTop: "0.25rem",
                fontWeight: "500"
              }}>
                {errors.username}
              </span>
            )}
          </div>

          {/* Email Field */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="email" style={{
              display: "block",
              marginBottom: "0.5rem",
              color: "#333",
              fontWeight: "600",
              fontSize: "0.9rem"
            }}>
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={handleFocus}
              required
              autoComplete="email"
              placeholder="Enter your email address"
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: `2px solid ${touched.email && errors.email ? '#e74c3c' : '#e1e5e9'}`,
                borderRadius: "10px",
                fontSize: "1rem",
                transition: "all 0.3s ease",
                background: "#fff",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
            {touched.email && errors.email && (
              <span style={{
                display: "block",
                color: "#e74c3c",
                fontSize: "0.8rem",
                marginTop: "0.25rem",
                fontWeight: "500"
              }}>
                {errors.email}
              </span>
            )}
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="password" style={{
              display: "block",
              marginBottom: "0.5rem",
              color: "#333",
              fontWeight: "600",
              fontSize: "0.9rem"
            }}>
              Password *
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                required
                autoComplete="new-password"
                placeholder="Enter your password"
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  paddingRight: "3rem",
                  border: `2px solid ${touched.password && errors.password ? '#e74c3c' : '#e1e5e9'}`,
                  borderRadius: "10px",
                  fontSize: "1rem",
                  transition: "all 0.3s ease",
                  background: "#fff",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
              <button 
                type="button"
                onClick={togglePasswordVisibility}
                tabIndex={-1}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  padding: "0.25rem",
                  borderRadius: "4px",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(0, 0, 0, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "none";
                }}
              >
            <i className="material-icons">
              {showPassword ? "visibility_off" : "visibility"}
            </i>
              </button>
            </div>
            {touched.password && errors.password && (
              <span style={{
                display: "block",
                color: "#e74c3c",
                fontSize: "0.8rem",
                marginTop: "0.25rem",
                fontWeight: "500"
              }}>
                {errors.password}
              </span>
            )}
          </div>

          {/* Confirm Password Field */}
          <div style={{ marginBottom: "2rem" }}>
            <label htmlFor="confirmPassword" style={{
              display: "block",
              marginBottom: "0.5rem",
              color: "#333",
              fontWeight: "600",
              fontSize: "0.9rem"
            }}>
              Confirm Password *
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                required
                autoComplete="new-password"
                placeholder="Confirm your password"
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  paddingRight: "3rem",
                  border: `2px solid ${touched.confirmPassword && errors.confirmPassword ? '#e74c3c' : '#e1e5e9'}`,
                  borderRadius: "10px",
                  fontSize: "1rem",
                  transition: "all 0.3s ease",
                  background: "#fff",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
              <button 
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                tabIndex={-1}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  padding: "0.25rem",
                  borderRadius: "4px",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(0, 0, 0, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "none";
                }}
              >
               <i className="material-icons">
                {showConfirmPassword ? "visibility_off" : "visibility"}
              </i>
              </button>
            </div>
            {touched.confirmPassword && errors.confirmPassword && (
              <span style={{
                display: "block",
                color: "#e74c3c",
                fontSize: "0.8rem",
                marginTop: "0.25rem",
                fontWeight: "500"
              }}>
                {errors.confirmPassword}
              </span>
            )}
          </div>

          {/* Password Requirements */}
          <div style={{
            background: "rgba(0, 188, 212, 0.05)",
            padding: "1rem",
            borderRadius: "10px",
            border: "1px solid rgba(0, 188, 212, 0.2)",
            marginBottom: "1.5rem"
          }}>
            <p style={{
              margin: "0 0 0.5rem 0",
              fontSize: "0.8rem",
              fontWeight: "600",
              color: "#0c2461"
            }}>
              Password Requirements:
            </p>
            <ul style={{
              margin: 0,
              paddingLeft: "1.2rem",
              fontSize: "0.75rem",
              color: "#666",
              lineHeight: "1.4"
            }}>
              <li style={{ 
                color: formData.password.length >= 6 ? "#00bcd4" : "#666",
                fontWeight: formData.password.length >= 6 ? "600" : "normal" 
              }}>
                At least 6 characters
              </li>
              <li style={{ 
                color: /[a-z]/.test(formData.password) ? "#00bcd4" : "#666",
                fontWeight: /[a-z]/.test(formData.password) ? "600" : "normal" 
              }}>
                One lowercase letter
              </li>
              <li style={{ 
                color: /[A-Z]/.test(formData.password) ? "#00bcd4" : "#666",
                fontWeight: /[A-Z]/.test(formData.password) ? "600" : "normal" 
              }}>
                One uppercase letter
              </li>
              <li style={{ 
                color: /\d/.test(formData.password) ? "#00bcd4" : "#666",
                fontWeight: /\d/.test(formData.password) ? "600" : "normal" 
              }}>
                One number
              </li>
            </ul>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSubmitting || hasErrors}
            style={{
              width: "100%",
              background: isSubmitting || hasErrors 
                ? "linear-gradient(135deg, #cccccc, #999999)" 
                : "linear-gradient(135deg, #00bcd4, #0097a7)",
              color: "#fff",
              border: "none",
              padding: "1rem 2rem",
              borderRadius: "10px",
              fontSize: "1.1rem",
              fontWeight: "600",
              cursor: isSubmitting || hasErrors ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              marginBottom: "1.5rem",
              position: "relative",
              overflow: "hidden"
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting && !hasErrors) {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 8px 20px rgba(0, 188, 212, 0.3)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting && !hasErrors) {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }
            }}
          >
            {isSubmitting ? (
              <span>Creating Account...</span>
            ) : (
              <span>Register</span>
            )}
          </button>

          {/* Login Link */}
          <div style={{
            textAlign: "center",
            color: "#666"
          }}>
            <span>Already have an account? </span>
            <Link 
              to="/login" 
              style={{
                color: "#00bcd4",
                textDecoration: "none",
                fontWeight: "600",
                transition: "color 0.2s"
              }}
              onMouseEnter={(e) => {
                e.target.style.color = "#0097a7";
              }}
              onMouseLeave={(e) => {
                e.target.style.color = "#00bcd4";
              }}
            >
              Login here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;