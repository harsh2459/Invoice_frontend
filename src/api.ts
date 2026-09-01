import { API_BASE } from "./config";

export const api = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as any),
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && endpoint !== "/auth/login") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new Error(data.error || "An error occurred");
  }
  
  return data;
};
