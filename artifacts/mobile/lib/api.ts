import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "fitpulse_api_token";

declare global {
  interface Window {
    __FITPULSE_CONFIG__?: {
      apiUrl?: string;
    };
  }
}

export class ApiError extends Error {
  status: number;
  offline: boolean;

  constructor(message: string, status = 0, offline = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.offline = offline;
  }
}

function baseUrl() {
  const runtimeApiUrl = typeof window !== "undefined" ? window.__FITPULSE_CONFIG__?.apiUrl?.trim() : "";
  if (runtimeApiUrl) return runtimeApiUrl.replace(/\/+$/, "");

  const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredApiUrl) return configuredApiUrl.replace(/\/+$/, "");

  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  return domain ? `https://${domain.replace(/^https?:\/\//, "")}/api` : "/api";
}

export async function getApiToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setApiToken(token: string | null) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

const API_REQUEST_TIMEOUT_MS = 12_000;

function isUnconfiguredApiUrl(url: string) {
  return url === "/api" || url.includes("your-backend.onrender.com") || url.includes("YOUR-BACKEND");
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getApiToken();
  const url = baseUrl();
  if (isUnconfiguredApiUrl(url)) {
    throw new ApiError("FitPulse backend is not configured. Using local mode.", 0, true);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${url}${path}`, {
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(body.message || body.error || `Request failed (${response.status})`, response.status);
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("FitPulse server is unavailable. Using local mode.", 0, true);
  } finally {
    clearTimeout(timeoutId);
  }
}