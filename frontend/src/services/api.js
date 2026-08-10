/**
 * Axios instance with base URL configuration and JWT interceptors.
 * Automatically attaches the access token to every request.
 * Handles 401 errors by clearing auth and redirecting to login.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// ─── Request Interceptor ────────────────────────────────────────────
// Attach JWT access token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ───────────────────────────────────────────
// Handle 401 (expired token) by attempting refresh, else logout
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the failed request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        // No refresh token — force logout
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const newToken = data.access_token;
        localStorage.setItem('access_token', newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

function clearAuthAndRedirect() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

// ─── Auth API ───────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/api/v1/auth/register', data),
  login: (data) => api.post('/api/v1/auth/login', data),
  logout: () => api.post('/api/v1/auth/logout'),
  getMe: () => api.get('/api/v1/auth/me'),
  changePassword: (data) => api.post('/api/v1/auth/change-password', data),
  forgotPassword: (email) => api.post('/api/v1/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/api/v1/auth/reset-password', data),
  refreshToken: (refresh_token) => api.post('/api/v1/auth/refresh', { refresh_token }),
};

// ─── Users API ──────────────────────────────────────────────────────
export const usersAPI = {
  list: (params) => api.get('/api/v1/users/', { params }),
  getById: (id) => api.get(`/api/v1/users/${id}`),
  updateMe: (data) => api.put('/api/v1/users/me', data),
  update: (id, data) => api.put(`/api/v1/users/${id}`, data),
  deactivate: (id) => api.delete(`/api/v1/users/${id}`),
};

// ─── Dashboard API ──────────────────────────────────────────────────
export const dashboardAPI = {
  getMetrics: () => api.get('/api/v1/dashboard/'),
};

// ─── Menu API ───────────────────────────────────────────────────────
export const menuAPI = {
  list: (params) => api.get('/api/v1/menu/', { params }),
  getById: (id) => api.get(`/api/v1/menu/${id}`),
  create: (data) => api.post('/api/v1/menu/', data),
  update: (id, data) => api.put(`/api/v1/menu/${id}`, data),
  delete: (id) => api.delete(`/api/v1/menu/${id}`),
};

// ─── Orders API ─────────────────────────────────────────────────────
export const ordersAPI = {
  list: (params) => api.get('/api/v1/orders/', { params }),
  getById: (id) => api.get(`/api/v1/orders/${id}`),
  create: (data) => api.post('/api/v1/orders/', data),
  updateStatus: (id, data) => api.patch(`/api/v1/orders/${id}/status`, data),
};

// ─── Customers API ──────────────────────────────────────────────────
export const customersAPI = {
  list: (params) => api.get('/api/v1/customers/', { params }),
  getById: (id) => api.get(`/api/v1/customers/${id}`),
  create: (data) => api.post('/api/v1/customers/', data),
  update: (id, data) => api.put(`/api/v1/customers/${id}`, data),
  delete: (id) => api.delete(`/api/v1/customers/${id}`),
};

// ─── Inventory API ──────────────────────────────────────────────────
export const inventoryAPI = {
  list: (params) => api.get('/api/v1/inventory/', { params }),
  getById: (id) => api.get(`/api/v1/inventory/${id}`),
  create: (data) => api.post('/api/v1/inventory/', data),
  update: (id, data) => api.put(`/api/v1/inventory/${id}`, data),
  delete: (id) => api.delete(`/api/v1/inventory/${id}`),
};

// ─── Food Waste API ───────────────────────────────────────────────
export const wasteAPI = {
  list: (params) => api.get('/api/v1/waste/', { params }),
  getById: (id) => api.get(`/api/v1/waste/${id}`),
  log: (data) => api.post('/api/v1/waste/', data),
  delete: (id) => api.delete(`/api/v1/waste/${id}`),
};

// ─── Employees API ───────────────────────────────────────────────
export const employeesAPI = {
  list: (params) => api.get('/api/v1/employees/', { params }),
  getById: (id) => api.get(`/api/v1/employees/${id}`),
  create: (data) => api.post('/api/v1/employees/', data),
  update: (id, data) => api.put(`/api/v1/employees/${id}`, data),
  delete: (id) => api.delete(`/api/v1/employees/${id}`),
};

// ─── Suppliers API ───────────────────────────────────────────────
export const suppliersAPI = {
  list: (params) => api.get('/api/v1/suppliers/', { params }),
  getById: (id) => api.get(`/api/v1/suppliers/${id}`),
  create: (data) => api.post('/api/v1/suppliers/', data),
  update: (id, data) => api.put(`/api/v1/suppliers/${id}`, data),
  delete: (id) => api.delete(`/api/v1/suppliers/${id}`),
};

// ─── Reviews API ───────────────────────────────────────────────
export const reviewsAPI = {
  list: (params) => api.get('/api/v1/reviews/', { params }),
  getById: (id) => api.get(`/api/v1/reviews/${id}`),
  create: (data) => api.post('/api/v1/reviews/', data),
  stats: () => api.get('/api/v1/reviews/stats'),
  delete: (id) => api.delete(`/api/v1/reviews/${id}`),
};

// ─── Reports API ───────────────────────────────────────────────
export const reportsAPI = {
  list: (params) => api.get('/api/v1/reports/', { params }),
  getById: (id) => api.get(`/api/v1/reports/${id}`),
  generate: (data) => api.post('/api/v1/reports/generate', data),
  delete: (id) => api.delete(`/api/v1/reports/${id}`),
};

// ─── AI Knowledge Assistant API ─────────────────────────────────────────
export const aiAPI = {
  chat: (data) => api.post('/api/v1/ai/chat', data),
  history: (params) => api.get('/api/v1/ai/history', { params }),
  getKnowledgeBase: () => api.get('/api/v1/ai/knowledge-base'),
  addKnowledgeDoc: (data) => api.post('/api/v1/ai/knowledge-base', data),
};

// ─── Machine Learning Analytics API ──────────────────────────────────────
export const mlAPI = {
  getDemandForecast: (days = 7) => api.get(`/api/v1/analytics/demand-forecast?days=${days}`),
  getCustomerSegments: () => api.get('/api/v1/analytics/customer-segments'),
  getAnomalies: () => api.get('/api/v1/analytics/anomalies'),
};

// ─── User Profile API ────────────────────────────────────────────────────
export const userAPI = {
  getProfile: () => api.get('/api/v1/users/me'),
  updateProfile: (data) => api.put('/api/v1/users/me', data),
};

export const settingsAPI = {
  get: () => api.get('/api/v1/settings/'),
  update: (data) => api.put('/api/v1/settings/', data),
};

export default api;

