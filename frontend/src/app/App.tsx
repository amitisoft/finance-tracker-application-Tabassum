import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from '../routes/ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import {
  AccountsPage,
  AddAccountPage,
  AddTransactionPage,
  BudgetsPage,
  CategoriesPage,
  DashboardPage,
  GoalsPage,
  ForgotPasswordPage,
  LoginPage,
  OnboardingPage,
  RecurringPage,
  RegisterPage,
  ReportsPage,
  InsightsPage,
  ResetPasswordPage,
  SettingsPage,
  RulesPage,
  TransactionsPage,
} from '../pages';

import '../app/app.css';

const queryClient = new QueryClient();
const SETTINGS_KEY = 'finance-tracker-settings';
const SETTINGS_EVENT = 'finance-settings-updated';

export default function App() {
  const [themeClass, setThemeClass] = React.useState('theme-light');

  React.useEffect(() => {
    const applyTheme = () => {
      try {
        const raw = window.localStorage.getItem(SETTINGS_KEY);
        const parsed = raw ? (JSON.parse(raw) as { theme?: 'LIGHT' | 'DARK' | 'SYSTEM' }) : {};
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        const resolvedTheme =
          parsed.theme === 'DARK'
            ? 'theme-dark'
            : parsed.theme === 'SYSTEM'
            ? prefersDark
              ? 'theme-dark'
              : 'theme-light'
            : 'theme-light';
        setThemeClass(resolvedTheme);
      } catch {
        setThemeClass('theme-light');
      }
    };

    applyTheme();
    window.addEventListener('storage', applyTheme);
    window.addEventListener(SETTINGS_EVENT, applyTheme);
    return () => {
      window.removeEventListener('storage', applyTheme);
      window.removeEventListener(SETTINGS_EVENT, applyTheme);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className={`finance-app-root ${themeClass}`}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="accounts" element={<AccountsPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="budgets" element={<BudgetsPage />} />
                <Route path="goals" element={<GoalsPage />} />
                <Route path="recurring" element={<RecurringPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="insights" element={<InsightsPage />} />
                <Route path="rules" element={<RulesPage />} />
                <Route path="onboarding" element={<OnboardingPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="transactions/new" element={<AddTransactionPage />} />
                <Route path="accounts/new" element={<AddAccountPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </div>
    </QueryClientProvider>
  );
}
