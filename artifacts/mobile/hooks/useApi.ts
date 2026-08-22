import { useAuth } from "@/context/AuthContext";

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
  }
  return "/api";
};

export function useApi() {
  async function apiFetch(path: string, options: RequestInit = {}) {
    const url = `${getBaseUrl()}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || data.error || `Request failed: ${res.status}`);
    }
    return res.json();
  }

  return { apiFetch };
}
