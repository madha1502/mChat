import axios from 'axios';

const backendUrl = import.meta.env.VITE_API_URL || '';
const baseApiUrl = backendUrl ? `${backendUrl.replace(/\/$/, '')}/api` : '/api';

export const api = axios.create({
  baseURL: baseApiUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aether_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthCheck = error.config?.url === '/auth/me';
      if (!isAuthCheck) {
        localStorage.removeItem('aether_token');
      }
    }
    return Promise.reject(error);
  }
);
