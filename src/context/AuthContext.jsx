import { createContext, useContext, useState, useEffect } from 'react';
import { getSession, setSession, clearSession, login as storeLogin } from '../services/store';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSession());

  useEffect(() => {
    if (user) setSession(user);
    else clearSession();
  }, [user]);

  const login = async (email, password, role) => {
    const result = await storeLogin(email, password, role);
    if (result.success) {
      setUser(result.user);
    }
    return result;
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
