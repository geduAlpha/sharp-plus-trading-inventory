import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Smart API Base URL Resolution
// Priority:
//   1. If running on a cloud host (Aletcloud, Render, Vercel, etc.)
//      → always use relative /api (same-host routing, no CORS issues)
//   2. If VITE_API_URL is set and doesn't contain localhost
//      → use VITE_API_URL as-is (explicit override for split deployments)
//   3. Development fallback → /api (proxied to http://localhost:5000 by Vite)
// ─────────────────────────────────────────────────────────────────────────────
export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;

  // Detect if running in a browser environment
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    const isLocalhost =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.');

    // On any remote/cloud host → always use relative /api
    // This covers Aletcloud, Render, Vercel, custom domains, etc.
    if (!isLocalhost) {
      return '/api';
    }

    // On localhost: use VITE_API_URL only if it doesn't contain localhost
    // (avoids accidentally baking a remote URL that breaks local dev)
    if (envUrl && envUrl.trim() && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl.replace(/\/+$/, '');
    }
  }

  // Fallback: relative /api works both in dev (via Vite proxy) and production
  return '/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000, // 30 second timeout for cloud cold starts
});

// ── Global login-in-progress guard ────────────────────────────────────────
// Set this to true while the login() function is executing to suppress any
// accidental 401 auto-logouts (e.g. from fetchPermissions during login).
export let loginInProgress = false;
export const setLoginInProgress = (val) => { loginInProgress = val; };

// ── Request interceptor: attach auth token ─────────────────────────────────
api.interceptors.request.use((config) => {
  const stored =
    localStorage.getItem('companyStockAuth') ||
    localStorage.getItem('hotelStockAuth');
  if (stored) {
    try {
      const { token } = JSON.parse(stored);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch { }
  }
  return config;
});

// ── Response interceptor: handle auth errors ───────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Never auto-logout if we're in the middle of the login flow
      if (loginInProgress) {
        return Promise.reject(error);
      }

      const reqUrl = error.config?.url || '';

      // Endpoints that should NEVER trigger auto-logout:
      // - Auth flow endpoints (login, OTP, password verification)
      // - Workflow verification (advance, approve, void, check, receive)
      // - Settings (fails gracefully with cached defaults)
      const isSafeEndpoint =
        reqUrl.includes('/auth/login') ||
        reqUrl.includes('/auth/request-otp') ||
        reqUrl.includes('/auth/verify-otp') ||
        reqUrl.includes('/auth/verify-password') ||
        reqUrl.includes('/advance') ||
        reqUrl.includes('/approve') ||
        reqUrl.includes('/void') ||
        reqUrl.includes('/check') ||
        reqUrl.includes('/receive') ||
        reqUrl.includes('/settings') ||
        error.response?.data?.message?.toLowerCase().includes('password');

      if (!isSafeEndpoint) {
        // Only auto-logout if there was actually an active session
        const hadSession =
          !!localStorage.getItem('companyStockAuth') ||
          !!localStorage.getItem('hotelStockAuth');

        if (hadSession) {
          localStorage.removeItem('companyStockAuth');
          localStorage.removeItem('hotelStockAuth');
          localStorage.removeItem('companyStockLastActivity');

          // Dispatch a custom event so React (AuthContext) can handle the redirect
          // cleanly via React Router — no hard page reload
          if (window.location.pathname !== '/login') {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

