import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

const LoginForm = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    captcha: "",
  });
  const [errors, setErrors] = useState({
    username: "",
    password: "",
    captcha: ""
  });
  const [touched, setTouched] = useState({
    username: false,
    password: false,
    captcha: false
  });
  const [captchaText, setCaptchaText] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const captchaCanvasRef = useRef(null);
  const { login } = useAuth();
  const navigate = useNavigate();


const handleLogin = async (credentials) => {
  const result = await login(credentials.username, credentials.password, credentials.rememberMe);
  
  if (result.success) {
    // Redirect to the page they tried to visit or dashboard
    const from = location.state?.from?.pathname || '/dashboard';
    navigate(from, { replace: true });
  } else {
    // Handle login error
    setError(result.error);
  }
};

  // Validation rules
  const validateField = (name, value) => {
    switch (name) {
      case 'username':
        if (!value.trim()) return 'User Login ID is required';
        if (value.length < 3) return 'User Login ID must be at least 3 characters';
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'User Login ID can only contain letters, numbers, and underscores';
        return '';
      
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        return '';
      
      case 'captcha':
        if (!value.trim()) return 'Captcha is required';
        return '';
      
      default:
        return '';
    }
  };

  // Generate random captcha text
  const generateCaptcha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let captcha = "";
    for (let i = 0; i < 1; i++) {
      captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(captcha);
    return captcha;
  };

  // Draw captcha on canvas
  const drawCaptcha = (text) => {
    const canvas = captchaCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background with gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "rgba(12, 36, 97, 0.1)");
    gradient.addColorStop(1, "rgba(30, 55, 153, 0.1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some noise
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 100}, ${Math.random() * 100}, ${Math.random() * 100}, 0.1)`;
      ctx.fillRect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        2,
        2
      );
    }

    // Draw text with some distortion
    ctx.font = "bold 22px Arial";
    ctx.fillStyle = "#1e3c72";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Add some character spacing and slight rotation
    const charSpacing = 18;
    const startX = canvas.width / 2 - ((text.length - 1) * charSpacing) / 2;
    
    for (let i = 0; i < text.length; i++) {
      ctx.save();
      ctx.translate(startX + i * charSpacing, canvas.height / 2);
      ctx.rotate((Math.random() - 0.5) * 0.3);
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }

    // Add some lines through the text
    ctx.strokeStyle = "rgba(255, 0, 0, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, Math.random() * canvas.height);
    ctx.lineTo(canvas.width - 10, Math.random() * canvas.height);
    ctx.stroke();
  };

  // Initialize captcha
  useEffect(() => {
    const newCaptcha = generateCaptcha();
    drawCaptcha(newCaptcha);
  }, []);

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

  // Combined blur handler for validation and styling
  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    // Set touched state
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    // Validate field
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));

    // Update styling
    e.target.style.borderColor = error ? '#e74c3c' : '#e1e5e9';
    e.target.style.boxShadow = "none";
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = "#00bcd4";
    e.target.style.boxShadow = "0 0 0 3px rgba(0, 188, 212, 0.1)";
  };

  const handleRefreshCaptcha = () => {
    const newCaptcha = generateCaptcha();
    drawCaptcha(newCaptcha);
    setFormData(prev => ({ ...prev, captcha: "" }));
    setErrors(prev => ({ ...prev, captcha: "" }));
    setTouched(prev => ({ ...prev, captcha: false }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = () => {
    const newErrors = {
      username: validateField('username', formData.username),
      password: validateField('password', formData.password),
      captcha: validateField('captcha', formData.captcha)
    };

    setErrors(newErrors);
    setTouched({
      username: true,
      password: true,
      captcha: true
    });

    return !Object.values(newErrors).some(error => error !== '');
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  // Case-sensitive captcha validation
  if (formData.captcha !== captchaText) {
    setErrors(prev => ({
      ...prev,
      captcha: 'Invalid captcha! Please try again.'
    }));
    setTouched(prev => ({
      ...prev,
      captcha: true
    }));
    
    // Refresh captcha without resetting form data
    const newCaptcha = generateCaptcha();
    drawCaptcha(newCaptcha);
    return;
  }

  setIsSubmitting(true);

  try {
    const result = await login(formData.username, formData.password);
    console.log(result)
    if (result.success) {
      navigate("/dashboard");
    } else {
      setErrors(prev => ({
        ...prev,
        username: result.error || 'Invalid credentials. Please check your username and password.'
      }));
      // Also update this one to not reset captcha field
      const newCaptcha = generateCaptcha();
      drawCaptcha(newCaptcha);
    }
  } catch (error) {
    console.error("Login failed:", error);
    setErrors(prev => ({
      ...prev,
      username: 'Something went wrong. Please try again.'
    }));
    // And this one too
    const newCaptcha = generateCaptcha();
    drawCaptcha(newCaptcha);
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
        maxWidth: "450px",
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
          marginBottom: "2.5rem",
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
            }}>🤖</span>
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
            Smart Evaluation System
          </p>
        </div>

        {/* Login Form */}
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
                autoComplete="current-password"
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

          {/* Captcha Field - Fixed Alignment */}
          <div style={{ marginBottom: "2rem" }}>
            <label htmlFor="captcha" style={{
              display: "block",
              marginBottom: "0.5rem",
              color: "#333",
              fontWeight: "600",
              fontSize: "0.9rem"
            }}>
              Captcha *
            </label>
            <div style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "stretch", // Changed to stretch for equal height
              height: "48px" // Fixed height for alignment
            }}>
              {/* Captcha Input */}
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  id="captcha"
                  name="captcha"
                  value={formData.captcha}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  onFocus={handleFocus}
                  placeholder="Enter captcha"
                  required
                  autoComplete="off"
                  style={{
                    width: "100%",
                    height: "100%",
                    padding: "0.75rem 1rem",
                    border: `2px solid ${touched.captcha && errors.captcha ? '#e74c3c' : '#e1e5e9'}`,
                    borderRadius: "10px",
                    fontSize: "1rem",
                    transition: "all 0.3s ease",
                    background: "#fff",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>
              
              {/* Captcha Display Container */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(255, 255, 255, 0.9)",
                padding: "0.4rem",
                borderRadius: "10px",
                border: "1px solid #e1e5e9",
                height: "100%",
                minWidth: "140px" // Fixed width for consistency
              }}>
                {/* Canvas Container */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(12, 36, 97, 0.05)",
                  borderRadius: "6px",
                  padding: "2px",
                  height: "100%"
                }}>
                  <canvas 
                    ref={captchaCanvasRef} 
                    width="110" 
                    height="32"
                    style={{
                      borderRadius: "4px",
                      display: "block"
                    }}
                  />
                </div>
                
                {/* Refresh Button */}
                <button 
                  type="button" 
                  onClick={handleRefreshCaptcha}
                  title="Refresh Captcha"
                  style={{
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.4rem",
                    cursor: "pointer",
                    color: "#fff",
                    fontSize: "0.9rem",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s ease",
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "rotate(90deg)";
                    e.target.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "rotate(0deg)";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  ↻
                </button>
              </div>
            </div>
            {touched.captcha && errors.captcha && (
              <span style={{
                display: "block",
                color: "#e74c3c",
                fontSize: "0.8rem",
                marginTop: "0.25rem",
                fontWeight: "500"
              }}>
                {errors.captcha}
              </span>
            )}
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
              <span>Logging in...</span>
            ) : (
              <span>Login</span>
            )}
          </button>

          {/* Register Link */}
          <div style={{
            textAlign: "center",
            color: "#666"
          }}>
            <span>Don't have an account? </span>
            <Link 
              to="/register" 
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
              Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;