/** Server-only settings. The browser never talks to FastAPI directly; it goes through /api/proxy. */
export const API_URL = (process.env.API_URL ?? "http://localhost:8000").replace(/\/$/, "");
export const API_BASE = `${API_URL}/api/v1`;

export const ACCESS_COOKIE = "sb_access";
export const REFRESH_COOKIE = "sb_refresh";
