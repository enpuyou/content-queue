"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authAPI } from "@/lib/api";
import { User } from "@/types";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string | undefined,
    username: string,
  ) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  mutate: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem("token");
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
    } catch {
      localStorage.removeItem("token");
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    await authAPI.login(email, password);
    await fetchUser();
  };

  const register = async (
    email: string,
    password: string,
    fullName: string | undefined,
    username: string,
  ) => {
    await authAPI.register(fullName || email, email, password, username);
    // Auto-login after registration
    await login(email, password);
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
  };

  const mutate = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, isLoading, mutate }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
