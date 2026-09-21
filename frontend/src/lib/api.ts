const API_BASE_URL = "/api";

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let msg = `Request failed with status ${response.status}`;
    if (typeof errorData.detail === "string") {
      msg = errorData.detail;
    } else if (Array.isArray(errorData.detail)) {
      msg = errorData.detail
        .map((e: any) => (e.loc ? `${e.loc.slice(1).join(".")}: ${e.msg}` : e.msg || JSON.stringify(e)))
        .join("; ");
    } else if (errorData.detail && typeof errorData.detail === "object") {
      msg = JSON.stringify(errorData.detail);
    } else if (errorData.message) {
      msg = errorData.message;
    }
    throw new Error(msg);
  }

  return response.json();
}
