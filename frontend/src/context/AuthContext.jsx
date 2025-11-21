// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, verifyToken } from '../api/auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allowedPages, setAllowedPages] = useState([]);

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const storedUser = localStorage.getItem('userData') || sessionStorage.getItem('userData');
      
      console.log('Auth check - Token exists:', !!token);
      console.log('Auth check - Stored user exists:', !!storedUser);

      if (token && storedUser) {
        try {
          // Try to verify token with backend
          const response = await verifyToken();
          console.log('Token verification response:', response);
          
          if (response.success) {
            setCurrentUser(response.user);
            setAllowedPages(response.allowedPages || []);
          } else {
            console.warn('Token verification failed, using stored user data');
            // If token verification fails but we have stored user data,
            // use the stored data as fallback
            setCurrentUser(JSON.parse(storedUser));
            setAllowedPages([]);
          }
        } catch (verifyError) {
          console.warn('Token verification error, using stored data:', verifyError);
          // Use stored user data as fallback if verification fails
          setCurrentUser(JSON.parse(storedUser));
          setAllowedPages([]);
        }
      } else if (token && !storedUser) {
        // We have token but no user data - this shouldn't happen, but try to verify
        try {
          const response = await verifyToken();
          if (response.success) {
            setCurrentUser(response.user);
            setAllowedPages(response.allowedPages || []);
            // Store the user data for next time
            const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage;
            storage.setItem('userData', JSON.stringify(response.user));
          }
        } catch (error) {
          console.error('Failed to verify token:', error);
          clearAuthData();
        }
      } else {
        // No token found
        clearAuthData();
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
      const response = await loginUser({ username, password });
      console.log('Login response:', response);

      if (response.access_token) {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('authToken', response.access_token);

        // Make sure we have user data from response
        const user = response.user || { 
          username: username, 
          role: response.role_name || 'user' 
        };
        
        storage.setItem('userData', JSON.stringify(user));
        setCurrentUser(user);
        setAllowedPages(response.allowedPages || []);

        return { success: true, user };
      } else {
        return { 
          success: false, 
          error: response.detail || 'Invalid credentials' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Login failed. Please try again.' 
      };
    }
  };

  // ... rest of your methods remain the same
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
    // Redirect to login page after logout
    window.location.href = '/login';
  }, []);

  const checkSession = useCallback(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const storedUser = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    
    if (!token || !storedUser) {
      return { valid: false, message: 'No authentication data found' };
    }

    try {
      return { 
        valid: !!currentUser, 
        user: currentUser,
        allowedPages: allowedPages 
      };
    } catch (error) {
      return { valid: false, message: 'Invalid session' };
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null || context === undefined) {
    console.error('useAuth called outside AuthProvider');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}