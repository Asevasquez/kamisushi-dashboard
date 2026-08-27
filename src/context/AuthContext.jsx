import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('@KamiSushi:token');
    const storedUser = localStorage.getItem('@KamiSushi:user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        api.defaults.headers.Authorization = `Bearer ${token}`;
      } catch (e) {
        localStorage.removeItem('@KamiSushi:token');
        localStorage.removeItem('@KamiSushi:user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, usuario } = response.data;

      localStorage.setItem('@KamiSushi:token', token);
      localStorage.setItem('@KamiSushi:user', JSON.stringify(usuario));

      api.defaults.headers.Authorization = `Bearer ${token}`;
      setUser(usuario);

      return { success: true };
    } catch (error) {
      // Propagar tanto el mensaje como el code del backend
      return {
        success: false,
        error: error.response?.data?.error || 'Error al iniciar sesión',
        code: error.response?.data?.code || '',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('@KamiSushi:token');
    localStorage.removeItem('@KamiSushi:user');
    delete api.defaults.headers.Authorization;
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}>
      {children}
    </AuthContext.Provider>
  );
};
