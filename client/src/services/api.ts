import axios from 'axios';

/**
 * Ensures the API base URL properly formats to include the '/api' prefix.
 */
const getBaseURL = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) {
    return '/api';
  }
  const trimmed = envUrl.trim().replace(/\/+$/, '');
  if (!trimmed.endsWith('/api')) {
    return `${trimmed}/api`;
  }
  return trimmed;
};

const API = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('resto_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthenticated
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || '';
      const isLoginRequest =
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/auth/chief-admin/login');

      // Only redirect on session expiration for non-login requests
      if (!isLoginRequest) {
        localStorage.removeItem('resto_token');
        localStorage.removeItem('resto_user');

        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/chief-admin')) {
          if (currentPath !== '/chief-admin/login' && currentPath !== '/chief-admin-login') {
            window.location.href = '/chief-admin/login';
          }
        } else if (currentPath !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;
