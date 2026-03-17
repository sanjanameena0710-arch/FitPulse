import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

export type User = {
  id: number;
  name: string;
  email: string;
  fitnessGoal: string;
  age?: number;
  weight?: number;
  height?: number;
  activityLevel?: string;
  avatarUrl?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  changeEmail: (newEmail: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};

type RegisterData = {
  name: string;
  email: string;
  password: string;
  fitnessGoal: string;
  age?: number;
  weight?: number;
  height?: number;
  activityLevel?: string;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const storedToken = await AsyncStorage.getItem("fitpulse_token");
      const storedUser = await AsyncStorage.getItem("fitpulse_user");
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error("Failed to load auth:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    await AsyncStorage.setItem("fitpulse_token", data.token);
    await AsyncStorage.setItem("fitpulse_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    router.replace("/(tabs)");
  }

  async function register(registerData: RegisterData) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registerData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");
    await AsyncStorage.setItem("fitpulse_token", data.token);
    await AsyncStorage.setItem("fitpulse_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    router.replace("/(tabs)");
  }

  async function logout() {
    try {
      await AsyncStorage.removeItem("fitpulse_token");
      await AsyncStorage.removeItem("fitpulse_user");
    } catch (_) {}
    setToken(null);
    setUser(null);
    router.replace("/(auth)/landing");
  }

  function updateUser(data: Partial<User>) {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    AsyncStorage.setItem("fitpulse_user", JSON.stringify(updated));
  }

  async function changeEmail(newEmail: string, password: string) {
    if (!user) throw new Error("Not logged in");
    const res = await fetch(`${API_BASE}/users/change-email`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, newEmail, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to change email");
    updateUser({ email: newEmail });
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!user) throw new Error("Not logged in");
    const res = await fetch(`${API_BASE}/users/change-password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to change password");
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser, changeEmail, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
