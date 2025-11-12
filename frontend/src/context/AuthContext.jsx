import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, verifyToken } from '../api/auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allowedPages, setAllowedPages] = useState([]);

  // Ensure children is provided
  if (!children) {
    console.warn('AuthProvider: children prop is missing');
  }

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (token) {
        const response = await verifyToken();
        if (response.success) {
          setCurrentUser(response.user);
          setAllowedPages(response.allowedPages || []);
        } else {
          // Token is invalid, clear storage
          clearAuthData();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearAuthData();
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAuthData = () => {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('userData');
    setCurrentUser(null);
    setAllowedPages([]);
  };

  const login = async (username, password, rememberMe = false) => {
    try {
      const response = await loginUser({ username, password }); // remove role
  
      if (response.access_token) {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('authToken', response.access_token);
  
        const user = { username, role: response.user.role_name }; 
        storage.setItem('userData', JSON.stringify(user));
  
        setCurrentUser(user);
        setAllowedPages([]);
  
        return { success: true, user };
      } else {
        return { success: false, error: response.detail || 'Invalid credentials' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Login failed. Please try again.' 
      };
    }
  };
  
  
  const register = async (userData) => {
    try {
      const response = await registerUser(userData);
      console.log(response)
      
      if (response.success) {
        return { success: true, user: response.user };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: error.message || 'Registration failed. Please try again.' 
      };
    }
  };

  const logout = useCallback(() => {
    clearAuthData();
    // Optional: Call logout API if you have one
    // await logoutUser();
  }, []);

  const checkSession = useCallback(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      return { valid: false, message: 'No token found' };
    }

    try {
      // You can add more sophisticated token validation here
      // For now, we'll assume the token is valid if it exists and we have a currentUser
      return { 
        valid: !!currentUser, 
        user: currentUser,
        allowedPages: allowedPages 
      };
    } catch (error) {
      return { valid: false, message: 'Invalid token' };
    }
  }, [currentUser, allowedPages]);

  const hasPermission = useCallback((page) => {
    if (!allowedPages || allowedPages.length === 0) return false;
    return allowedPages.includes(page);
  }, [allowedPages]);

  const value = {
    currentUser,
    loading,
    allowedPages,
    login,
    register,
    logout,
    checkSession,
    hasPermission,
    isAuthenticated: !!currentUser
  };

  // Ensure value is always an object
  if (!value) {
    console.error('AuthProvider value is undefined');
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null || context === undefined) {
    console.error('useAuth called outside AuthProvider. Make sure your component is wrapped in <AuthProvider>');
    console.trace('Stack trace:');
    throw new Error('useAuth must be used within an AuthProvider. Please wrap your app with <AuthProvider> in App.jsx');
  }
  return context;
}

export default AuthContext;