import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ims_token') || null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          localStorage.removeItem('ims_token');
          setToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to validate token:', error);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      localStorage.setItem('ims_token', data.token);
      setToken(data.token);
      setUser(data.user);
      navigate('/');
      toast.success('Logged in successfully');
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  const signup = async (name, email, password) => {
    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      
      localStorage.setItem('ims_token', data.token);
      setToken(data.token);
      setUser(data.user);
      navigate('/');
      toast.success('Account created successfully');
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  const setSession = (newToken, newUser) => {
    localStorage.setItem('ims_token', newToken);
    setToken(newToken);
    setUser(newUser);
    navigate('/');
    toast.success('Logged in successfully');
  };

  const updateUser = (updatedUser) => {
    setUser(prev => ({ ...prev, ...updatedUser }));
  };

  const logout = () => {
    localStorage.removeItem('ims_token');
    setToken(null);
    setUser(null);
    navigate('/login');
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, setSession, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
