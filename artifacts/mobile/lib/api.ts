import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "fitpulse_api_token";

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
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}/api` : "/api";
}

export async function getApiToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setApiToken(token: string | null) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getApiToken();
  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      ...options,
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
    throw new ApiError("FitPulse server is unavailable. Using offline mode.", 0, true);
  }
}