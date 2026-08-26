import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { LocalStore, StoredUser } from "@/lib/localStore";
import { apiRequest, ApiError, setApiToken, getApiToken } from "@/lib/api";

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

type AuthResponse = { token: string; user: User };

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
      const token = await getApiToken();
      const remoteUser = await AsyncStorage.getItem("fitpulse_remote_user");
      if (token && remoteUser) {
        setUser(JSON.parse(remoteUser) as User);
        return;
      }
      const current = await LocalStore.getCurrentUser();
      if (current) setUser(toUser(current));
    } catch (err) {
      console.error("Auth init failed:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    try {
      const response = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      await setApiToken(response.token);
      await AsyncStorage.setItem("fitpulse_remote_user", JSON.stringify(response.user));
      setUser(response.user);
    } catch (error) {
      if (!(error instanceof ApiError) || !error.offline) throw error;
      const u = await LocalStore.login(email, password);
      setUser(toUser(u));
    }
    router.replace("/(tabs)");
  }

  async function register(data: RegisterData) {
    try {
      const response = await apiRequest<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
      await setApiToken(response.token);
      await AsyncStorage.setItem("fitpulse_remote_user", JSON.stringify(response.user));
      setUser(response.user);
    } catch (error) {
      if (!(error instanceof ApiError) || !error.offline) throw error;
      const u = await LocalStore.register(data);
      setUser(toUser(u));
    }
    router.replace("/(tabs)");
  }

  async function logout() {
    await LocalStore.logout();
    await setApiToken(null);
    await AsyncStorage.removeItem("fitpulse_remote_user");
    setUser(null);
    router.replace("/(auth)/landing");
  }

  async function updateUser(data: Partial<User>) {
    if (!user) return;
    try {
      const updated = await apiRequest<User>("/users/profile", {
        method: "PUT",
        body: JSON.stringify({ userId: user.id, ...data }),
      });
      await AsyncStorage.setItem("fitpulse_remote_user", JSON.stringify(updated));
      setUser(updated);
    } catch (error) {
      if (!(error instanceof ApiError) || !error.offline) throw error;
      const updated = await LocalStore.updateUser(user.id, data);
      setUser(toUser(updated));
    }
  }

  async function changeEmail(newEmail: string, password: string) {
    if (!user) throw new Error("Not logged in");
    try {
      const updated = await apiRequest<Partial<User> & { email: string }>("/users/change-email", {
        method: "PUT",
        body: JSON.stringify({ newEmail: newEmail.trim().toLowerCase(), password }),
      });
      const nextUser = { ...user, ...updated };
      await AsyncStorage.setItem("fitpulse_remote_user", JSON.stringify(nextUser));
      setUser(nextUser);
    } catch (error) {
      if (!(error instanceof ApiError) || !error.offline) throw error;
      const updated = await LocalStore.changeEmail(user.id, newEmail, password);
      setUser(toUser(updated));
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!user) throw new Error("Not logged in");
    try {
      await apiRequest("/users/change-password", {
        method: "PUT",
        body: JSON.stringify({ userId: user.id, currentPassword, newPassword }),
      });
    } catch (error) {
      if (!(error instanceof ApiError) || !error.offline) throw error;
      await LocalStore.changePassword(user.id, currentPassword, newPassword);
    }
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
