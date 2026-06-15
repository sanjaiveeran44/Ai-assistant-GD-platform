import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      const parsed = JSON.parse(storedUser);
      // Ensure id is always the uuid string, not an ObjectId
      const normalizedUser = { ...parsed, id: parsed.id || parsed._id };
      setUser(normalizedUser);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;

    console.log('[AuthContext] login response user:', user);

    // The server now always returns a clean 'id' (uuid). Keep _id fallback
    // only as a safety net in case of very old cached responses.
    const normalizedUser = {
      ...user,
      id: user.id || user._id,
    };

    if (!normalizedUser.id) {
      console.error('[AuthContext] WARNING: user has no id after login!', user);
    }

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setUser(normalizedUser);

    return normalizedUser;
  };

  const register = async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
