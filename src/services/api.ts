import axios from 'axios';

// Configure axios with base URL and default settings
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem('atacado-canoa-user');
    if (user) {
      try {
        const parsedUser = JSON.parse(user);
        // In a real app, you'd store and use a JWT token
        config.headers.Authorization = `Bearer ${parsedUser.id}`;
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('atacado-canoa-user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),
  logout: () => api.post('/auth/logout'),
};

export const productsAPI = {
  getAll: (params?: { category?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/products', { params }),
  getById: (id: string) => api.get(`/products/${id}`),
  create: (product: any) => api.post('/products', product),
  update: (id: string, product: any) => api.put(`/products/${id}`, product),
  delete: (id: string) => api.delete(`/products/${id}`),
};

export const ordersAPI = {
  create: (order: any) => api.post('/orders', order),
  getByUser: (userId: string) => api.get(`/orders/user/${userId}`),
  getById: (id: string) => api.get(`/orders/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/orders/${id}/status`, { status }),
};

export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  create: (category: any) => api.post('/categories', category),
  update: (id: string, category: any) => api.put(`/categories/${id}`, category),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

export default api;