import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';
import { syncLocation } from '../utils/location';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser({ ...response.data, loggedIn: true });
      syncLocation();
    } catch (err) {
      console.error("Error loading user data", err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
    
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      await fetchMe();
      
      return response.data;
    } catch (err) {
      console.error("Login failed", err);
      throw err;
    }
  };

  const register = async (fullName, email, password, birthdate, gender) => {
    const response = await api.post('/auth/register', { 
      full_name: fullName, 
      email, 
      password,
      birthdate,
      gender
    });
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};