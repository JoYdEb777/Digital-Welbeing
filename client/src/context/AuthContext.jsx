// client/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = "https://digital-welbeing-backend.onrender.com";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('dw_token'));
  const [loading, setLoading] = useState(true);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${API_URL}/auth/me`);
        setUser(res.data.user);
      } catch {
        localStorage.removeItem('dw_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    verifyToken();
  }, [token]);

  const login = useCallback(async (email, password) => {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('dw_token', newToken);
    setToken(newToken);
    setUser(userData);
    return res.data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await axios.post(`${API_URL}/auth/register`, { name, email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('dw_token', newToken);
    setToken(newToken);
    setUser(userData);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('dw_token');
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
