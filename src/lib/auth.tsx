"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "BUILDER" | "EXPLORER" | "AGENT_OPERATOR";
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "foliomuse-auth";

function getUsers(): Record<string, User & { password: string }> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(`${STORAGE_KEY}-users`) || "{}");
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, User & { password: string }>) {
  localStorage.setItem(`${STORAGE_KEY}-users`, JSON.stringify(users));
}

function getSession(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(`${STORAGE_KEY}-session`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function saveSession(user: User | null) {
  if (user) {
    localStorage.setItem(`${STORAGE_KEY}-session`, JSON.stringify(user));
  } else {
    localStorage.removeItem(`${STORAGE_KEY}-session`);
  }
}

// ponytail: simple hash for demo — use bcrypt in production
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getSession());
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const users = getUsers();
    const existing = users[email.toLowerCase()];
    
    if (!existing || existing.password !== hashPassword(password)) {
      return { success: false, error: "Invalid email or password" };
    }

    const { password: _, ...userData } = existing;
    setUser(userData);
    saveSession(userData);
    return { success: true };
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const users = getUsers();
    const key = email.toLowerCase();
    
    if (users[key]) {
      return { success: false, error: "Email already registered" };
    }

    const newUser: User & { password: string } = {
      id: crypto.randomUUID(),
      name,
      email: key,
      role: "BUILDER",
      createdAt: new Date().toISOString(),
      password: hashPassword(password),
    };

    users[key] = newUser;
    saveUsers(users);

    const { password: _, ...userData } = newUser;
    setUser(userData);
    saveSession(userData);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    saveSession(null);
  }, []);

  const updateProfile = useCallback((updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    saveSession(updated);
    
    // Also update in users store
    const users = getUsers();
    if (users[user.email]) {
      users[user.email] = { ...users[user.email], ...updates };
      saveUsers(users);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
