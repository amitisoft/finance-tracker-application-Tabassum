import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { authService } from '../services/auth';
import { getErrorMessage } from '../utils/errors';
import './AuthForm.css';
import { API_BASE_URL } from '../constants/api';

const registerSchema = z
  .object({
    displayName: z.string().min(2, 'Enter a name'),
    email: z.string().email('Invalid email'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/,
        'Password must include upper, lower, and numeric characters'
      ),
    confirmPassword: z.string().min(8),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [status, setStatus] = useState<string>('');
  const [emailConflict, setEmailConflict] = useState(false);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: RegisterForm) => {
    setStatus('');
    setEmailConflict(false);
      try {
        console.log('DEBUG REGISTER URL =', `${API_BASE_URL}/auth/register`);
        await authService.register({
        displayName: values.displayName,
        email: values.email,
        password: values.password,
      });
      navigate('/login', {
        replace: true,
        state: {
          registeredEmail: values.email.trim().toLowerCase(),
          registrationSuccess: 'Account created successfully. Please sign in to continue.',
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setEmailConflict(true);
        setStatus('An account with this email already exists. Please sign in instead.');
        return;
      }
      setStatus(getErrorMessage(error, 'Could not register right now. Please try again.'));
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <header className="auth-card-header">
          <p className="auth-eyebrow">Finance Tracker</p>
          <h1>Create account</h1>
          <p>Register to unlock dashboards, budgets, and recurring automation.</p>
        </header>

        {status && (
          <div className="auth-status error" role="status">
            <p>{status}</p>
            {emailConflict && (
              <p>
                <Link to="/login">Go to sign in</Link>
              </p>
            )}
          </div>
        )}

        <div style={{ fontSize: '12px', color: 'red' }}>
          DEBUG API: {API_BASE_URL}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <label htmlFor="register-display-name">
            Display name
            <input
              id="register-display-name"
              type="text"
              {...register('displayName')}
              aria-invalid={Boolean(errors.displayName)}
              aria-describedby="register-display-name-error"
            />
            {errors.displayName && (
              <span className="form-help" id="register-display-name-error">
                {errors.displayName.message}
              </span>
            )}
          </label>

          <label htmlFor="register-email">
            Email
            <input
              id="register-email"
              type="email"
              {...register('email')}
              aria-invalid={Boolean(errors.email)}
              aria-describedby="register-email-error"
            />
            {errors.email && (
              <span className="form-help" id="register-email-error">
                {errors.email.message}
              </span>
            )}
          </label>

          <label htmlFor="register-password">
            Password
            <input
              id="register-password"
              type="password"
              {...register('password')}
              aria-invalid={Boolean(errors.password)}
              aria-describedby="register-password-error"
            />
            {errors.password && (
              <span className="form-help" id="register-password-error">
                {errors.password.message}
              </span>
            )}
          </label>

          <label htmlFor="register-confirm-password">
            Confirm password
            <input
              id="register-confirm-password"
              type="password"
              {...register('confirmPassword')}
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby="register-confirm-password-error"
            />
            {errors.confirmPassword && (
              <span className="form-help" id="register-confirm-password-error">
                {errors.confirmPassword.message}
              </span>
            )}
          </label>

          <button type="submit" className="primary-btn auth-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <div className="auth-links">
          <p>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
