import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import type { AuthTokens } from '../types/auth';
import { API_BASE_URL } from '../constants/api';

const authClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isDev = import.meta.env.DEV;

type AuthServerResponse = {
  access_token: string;
  refresh_token: string;
  refresh_expires_at: number;
};

type ForgotPasswordResponse = {
  message: string;
  resetToken?: string | null;
};

const normalizeResponse = (response: AuthServerResponse): AuthTokens => ({
  accessToken: response.access_token,
  refreshToken: response.refresh_token,
  refreshExpiresAt: response.refresh_expires_at,
});

const persistAuthResponse = (response: AuthServerResponse) => {
  if (isDev) {
    console.debug('[auth] raw response', response);
  }
  const normalized = normalizeResponse(response);
  if (isDev) {
    console.debug('[auth] normalized auth object', normalized);
  }
  useAuthStore.getState().setTokens(normalized);
  if (isDev) {
    console.debug(
      '[auth] localStorage snapshot',
      window.localStorage.getItem('finance-tracker-auth')
    );
  }
  return normalized;
};

const logAuthAttempt = (action: 'login' | 'register', email: string) => {
  if (!isDev) {
    return;
  }
  console.debug(`[auth] ${action} request`, { email });
};

const logAuthResult = (action: 'login' | 'register', email: string, status: number) => {
  if (!isDev) {
    return;
  }
  console.debug(`[auth] ${action} response status`, { email, status });
};

const debugResponse = (label: string, payload: unknown) => {
  if (!isDev) {
    return;
  }
  console.debug(label, payload);
};

export const authService = {
  register: async (payload: { displayName: string; email: string; password: string }) => {
    const email = normalizeEmail(payload.email);
    logAuthAttempt('register', email);
    try {
      const res = await authClient.post<AuthServerResponse>('/auth/register', {
        displayName: payload.displayName,
        email,
        password: payload.password,
      });
      console.log('REGISTER RESPONSE', res);
      logAuthResult('register', email, res.status);
      return persistAuthResponse(res.data);
    } catch (error) {
      console.log('REGISTER ERROR', error);
      console.log('REGISTER ERROR RESPONSE', axios.isAxiosError(error) ? error.response?.data : undefined);
      console.log('REGISTER ERROR STATUS', axios.isAxiosError(error) ? error.response?.status : undefined);
      debugResponse('[auth] register axios error', error);
      if (axios.isAxiosError(error)) {
        logAuthResult('register', email, error.response?.status ?? 0);
      }
      throw error;
    }
  },
  login: async (payload: { email: string; password: string }) => {
    const email = normalizeEmail(payload.email);
    logAuthAttempt('login', email);
    try {
      const res = await authClient.post<AuthServerResponse>('/auth/login', {
        ...payload,
        email,
      });
      console.log('LOGIN RESPONSE', res);
      logAuthResult('login', email, res.status);
      return persistAuthResponse(res.data);
    } catch (error) {
      console.log('LOGIN ERROR', error);
      console.log('LOGIN ERROR RESPONSE', axios.isAxiosError(error) ? error.response?.data : undefined);
      console.log('LOGIN ERROR STATUS', axios.isAxiosError(error) ? error.response?.status : undefined);
      debugResponse('[auth] login axios error', error);
      if (axios.isAxiosError(error)) {
        logAuthResult('login', email, error.response?.status ?? 0);
      }
      throw error;
    }
  },
  refreshTokens: () => {
    const { refreshToken } = useAuthStore.getState();
    if (!refreshToken) {
      return Promise.reject(new Error('Missing refresh token'));
    }
    return authClient
      .post<AuthServerResponse>('/auth/refresh', { refreshToken })
      .then((res) => persistAuthResponse(res.data));
  },
  logout: () => {
    const { refreshToken } = useAuthStore.getState();
    if (!refreshToken) {
      useAuthStore.getState().clearAuth();
      return Promise.resolve();
    }
    return authClient.post('/auth/logout', { refreshToken }).finally(() => {
      useAuthStore.getState().clearAuth();
    });
  },
  forgotPassword: (payload: { email: string }) =>
    authClient
      .post<ForgotPasswordResponse>('/auth/forgot-password', {
        ...payload,
        email: normalizeEmail(payload.email),
      })
      .then((res) => res.data),
  resetPassword: (payload: { token: string; password: string }) =>
    authClient.post('/auth/reset-password', payload),
};
