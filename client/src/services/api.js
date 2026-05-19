// client/src/services/api.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let accessToken = null;
let refreshPromise = null;

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  timeout: 10000,
});

// Stores the short-lived access token in memory for Authorization headers.
export function setAccessToken(token) {
  accessToken = token;
}

// Clears the in-memory access token without touching persistent storage.
export function clearAccessToken() {
  accessToken = null;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then((response) => {
        const newToken = response.data?.accessToken;

        if (!newToken) {
          throw new Error('Refresh did not return an access token');
        }

        setAccessToken(newToken);
        return newToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      return {
        data: {
          offline: true,
        },
        offline: true,
        status: 0,
      };
    }

    const originalConfig = error.config;
    const isRefreshRequest = originalConfig?.url?.includes('/auth/refresh');

    if (error.response.status === 401 && originalConfig && !originalConfig._retry && !isRefreshRequest) {
      originalConfig._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalConfig.headers = originalConfig.headers ?? {};
        originalConfig.headers.Authorization = `Bearer ${newToken}`;
        return api(originalConfig);
      } catch (refreshError) {
        clearAccessToken();

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
