import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { authService } from './auth';
import { getResolvedAccessToken, useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../constants/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState();
  const resolvedAccessToken = accessToken ?? getResolvedAccessToken();
  if (resolvedAccessToken && config.headers) {
    config.headers.Authorization = `Bearer ${resolvedAccessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError & { config?: InternalAxiosRequestConfig & { _retry?: boolean } }) => {
    const originalConfig = error.config;
    if (
      error.response?.status === 401 &&
      originalConfig &&
      !originalConfig._retry
    ) {
      originalConfig._retry = true;
      try {
        await authService.refreshTokens();
        const { accessToken } = useAuthStore.getState();
        const resolvedAccessToken = accessToken ?? getResolvedAccessToken();
          if (resolvedAccessToken && originalConfig.headers) {
            originalConfig.headers.Authorization = `Bearer ${resolvedAccessToken}`;
          }
          return apiClient(originalConfig);
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
