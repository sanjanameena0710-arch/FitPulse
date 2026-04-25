import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { router } from "expo-router";
import { LocalStore, StoredUser } from "@/lib/localStore";

export type User = {
  id: number;
  name: string;
  email: string;
  fitnessGoal: string;
  age?: number;
  weight?: number;
  height?: number;
  activityLevel?: string;
  bio?: string;
  avatarUrl?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
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

function toUser(u: StoredUser): User {
  const { password, ...rest } = u;
  return rest;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      await LocalStore.ensureSeeded();
      const current = await LocalStore.getCurrentUser();
      if (current) setUser(toUser(current));
    } catch (err) {
      console.error("Auth init failed:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const u = await LocalStore.login(email, password);
    setUser(toUser(u));
    router.replace("/(tabs)");
  }

  async function register(data: RegisterData) {
    const u = await LocalStore.register(data);
    setUser(toUser(u));
    router.replace("/(tabs)");
  }

  async function logout() {
    await LocalStore.logout();
    setUser(null);
    router.replace("/(auth)/landing");
  }

  async function updateUser(data: Partial<User>) {
    if (!user) return;
    const updated = await LocalStore.updateUser(user.id, data);
    setUser(toUser(updated));
  }

  async function changeEmail(newEmail: string, password: string) {
    if (!user) throw new Error("Not logged in");
    const updated = await LocalStore.changeEmail(user.id, newEmail, password);
    setUser(toUser(updated));
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!user) throw new Error("Not logged in");
    await LocalStore.changePassword(user.id, currentPassword, newPassword);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser, changeEmail, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
