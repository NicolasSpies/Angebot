import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('auth_user')));

    const login = (email, password) => {
        // Simple mock auth
        if (email === 'admin@agency.com' && password === 'admin') {
            const userData = { email, role: 'admin', name: 'Master Admin' };
            setUser(userData);
            localStorage.setItem('auth_user', JSON.stringify(userData));
            return true;
        } else if (email === 'user@agency.com' && password === 'user') {
            const userData = { email, role: 'user', name: 'Standard User' };
            setUser(userData);
            localStorage.setItem('auth_user', JSON.stringify(userData));
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('auth_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
