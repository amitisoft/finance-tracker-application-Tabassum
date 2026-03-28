import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { authService } from '../services/auth';
import { getResolvedAccessToken, useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../utils/errors';
import './AuthForm.css';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;
type LoginLocationState = {
  registeredEmail?: string;
  registrationSuccess?: string;
};

export default function LoginPage() {
  const [status, setStatus] = useState<string>('');
  const [invalidCredentials, setInvalidCredentials] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isDev = import.meta.env.DEV;
  const accessToken = useAuthStore((state) => state.accessToken);
  const resolvedAccessToken = accessToken ?? getResolvedAccessToken();
  const locationState = (location.state as LoginLocationState | null) ?? null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (resolvedAccessToken) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, resolvedAccessToken]);

  useEffect(() => {
    if (!locationState) {
      return;
    }
    if (locationState.registeredEmail) {
      reset({ email: locationState.registeredEmail, password: '' });
    }
    if (locationState.registrationSuccess) {
      setInvalidCredentials(false);
      setStatus(locationState.registrationSuccess);
    }
  }, [locationState, reset]);

  const onSubmit = async (values: LoginForm) => {
    setStatus('');
    setInvalidCredentials(false);
    try {
      await authService.login(values);
      if (isDev) {
        console.debug('[login] successful submit', values);
      }
      navigate('/dashboard', { replace: true });
    } catch (error) {
      if (isDev) {
        console.debug('[login] caught error', error);
      }
    if (axios.isAxiosError(error)) {
      console.log('LOGIN PAGE ERROR', error);
      console.log('LOGIN PAGE ERROR RESPONSE', error.response?.data);
      console.log('LOGIN PAGE ERROR STATUS', error.response?.status);
      if (!error.response) {
        setStatus('Unable to reach the server. Please check your connection and try again.');
        return;
      }
      if (error.response.status === 401) {
        setInvalidCredentials(true);
        setStatus('Invalid email or password. Please check your credentials and try again.');
        return;
      }
      setStatus(
        getErrorMessage(error, 'Authentication failed. Please verify your credentials and try again.')
      );
      return;
    }
    setStatus('An unexpected error occurred. Please try again.');
  }
};

  if (resolvedAccessToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <header className="auth-card-header">
          <p className="auth-eyebrow">Finance Tracker</p>
          <h1>Sign in</h1>
          <p>Access dashboards, budgets, and insights with a secure login.</p>
        </header>

        {status && (
          <div className="auth-status error" role="status">
            <p>{status}</p>
            {invalidCredentials && (
              <p>
                Need help? <Link to="/forgot-password">Reset your password</Link>
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <label htmlFor="login-email">
            Email
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              {...register('email')}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
            />
            {errors.email && (
              <span className="form-help" id="login-email-error">
                {errors.email.message}
              </span>
            )}
          </label>

          <label htmlFor="login-password">
            Password
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
              />
            {errors.password && (
              <span className="form-help" id="login-password-error">
                {errors.password.message}
              </span>
            )}
          </label>

          <button type="submit" className="primary-btn auth-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-links">
          <p>
            New user? <Link to="/register">Create an account</Link>
          </p>
          <p>
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
