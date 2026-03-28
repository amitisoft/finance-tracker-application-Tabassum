import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useAccountsQuery } from '../../hooks/useAccounts';
import { useGoals } from '../../hooks/useGoals';
import { useRecurring } from '../../hooks/useRecurring';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useUIStore } from '../../store/uiStore';
import { profileService, type Profile } from '../../services/profile';
import './layout.css';

const navItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/transactions', label: 'Transactions' },
  { path: '/accounts', label: 'Accounts' },
  { path: '/categories', label: 'Categories' },
  { path: '/budgets', label: 'Budgets' },
  { path: '/goals', label: 'Goals' },
  { path: '/recurring', label: 'Recurring' },
  { path: '/reports', label: 'Reports' },
  { path: '/insights', label: 'Insights' },
  { path: '/rules', label: 'Rules' },
  { path: '/settings', label: 'Settings' },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/accounts': 'Accounts',
  '/categories': 'Categories',
  '/budgets': 'Budgets',
  '/goals': 'Goals',
  '/recurring': 'Recurring',
  '/reports': 'Reports',
  '/insights': 'Insights',
  '/rules': 'Rules',
  '/settings': 'Settings',
  '/transactions/new': 'Add Transaction',
  '/accounts/new': 'Add Account',
};

type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  path: string;
};

const READ_NOTIFICATIONS_KEY = 'finance-tracker-read-notifications';

const loadReadNotificationIds = () => {
  const raw = window.localStorage.getItem(READ_NOTIFICATIONS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(READ_NOTIFICATIONS_KEY);
    return [];
  }
};

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const resetOnboarding = useOnboardingStore((state) => state.reset);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(loadReadNotificationIds);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileInfo, setProfileInfo] = useState<Profile | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const accountsQuery = useAccountsQuery();
  const goalsQuery = useGoals();
  const recurringQuery = useRecurring();

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];
    const goals = goalsQuery.data ?? [];
    const accounts = accountsQuery.data ?? [];
    const recurringItems = recurringQuery.data ?? [];

    const completedGoal = goals.find((goal) => goal.status === 'COMPLETED');
    if (completedGoal) {
      items.push({
        id: `goal-complete-${completedGoal.id}`,
        title: `${completedGoal.name} is completed`,
        detail: `Your goal reached ${completedGoal.progressPercent.toFixed(0)}% of target.`,
        path: '/goals',
      });
    }

    const nearlyDoneGoal = goals.find(
      (goal) => goal.status !== 'COMPLETED' && goal.progressPercent >= 80
    );
    if (nearlyDoneGoal) {
      items.push({
        id: `goal-near-${nearlyDoneGoal.id}`,
        title: `${nearlyDoneGoal.name} is close`,
        detail: `Only ${Math.max(0, 100 - nearlyDoneGoal.progressPercent).toFixed(0)}% left to finish this goal.`,
        path: '/goals',
      });
    }

    if (accounts.length > 0) {
      const latestAccount = [...accounts].sort(
        (a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
      )[0];
      items.push({
        id: `account-${latestAccount.id}`,
        title: `${latestAccount.name} was updated`,
        detail: 'Open Accounts to review your latest account activity.',
        path: '/accounts',
      });
    }

    const dueRecurring = recurringItems
      .filter((item) => item.active)
      .sort((a, b) => new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime())[0];
    if (dueRecurring) {
      items.push({
        id: `recurring-${dueRecurring.id}`,
        title: `${dueRecurring.title} is coming up`,
        detail: `Next run is on ${new Date(dueRecurring.nextRun).toLocaleDateString()}.`,
        path: '/recurring',
      });
    }

    return items.slice(0, 4);
  }, [accountsQuery.data, goalsQuery.data, recurringQuery.data]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !readNotificationIds.includes(item.id)).length,
    [notifications, readNotificationIds]
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  useEffect(() => {
    setNotificationsOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    window.localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(readNotificationIds));
  }, [readNotificationIds]);

  useEffect(() => {
    let active = true;
    profileService
      .getProfile()
      .then((data: Profile) => {
        if (!active) {
          return;
        }
        setProfileInfo(data);
      })
      .catch(() => {
        // no-op
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) {
      return undefined;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  const markNotificationsRead = (ids: string[]) => {
    if (ids.length === 0) {
      return;
    }
    setReadNotificationIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const closeMobileSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout().catch(() => undefined);
    resetOnboarding();
    setProfileMenuOpen(false);
    navigate('/login');
  };

  const currentTitle = pageTitles[location.pathname] ?? 'Finance Tracker';

  return (
    <div className="app-shell">
      {isMobile && sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`app-sidebar ${isMobile ? (sidebarOpen ? 'mobile-open' : '') : 'desktop-open'}`}
      >
        <div className="sidebar-header">
          <div className="sidebar-logo">Finance Tracker</div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeMobileSidebar}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-left">
            {isMobile && (
              <button
                type="button"
                className="topbar-menu-btn"
                aria-label="Open sidebar"
                onClick={() => setSidebarOpen(true)}
              >
                Menu
              </button>
            )}

            <div className="topbar-logo">
              <div className="logo-icon">FT</div>
              <div className="topbar-title-block">
                <span className="logo-text">Finance Tracker</span>
                <small className="topbar-subtitle">{currentTitle}</small>
              </div>
            </div>
          </div>

          <div className="topbar-right">
            <div className={`topbar-notifications ${notificationsOpen ? 'open' : ''}`}>
              <button
                type="button"
                className="topbar-icon-btn"
                aria-label="Open notifications"
                onClick={() => {
                  setNotificationsOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      markNotificationsRead(notifications.map((item) => item.id));
                    }
                    return next;
                  });
                }}
              >
                <span className="topbar-bell" aria-hidden="true">
                  🔔
                </span>
                {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
              </button>

              {notificationsOpen && (
                <div className="notification-panel" role="dialog" aria-label="Notifications">
                  <div className="notification-panel-head">
                    <strong>Notifications</strong>
                    <small>{unreadCount === 0 ? 'All caught up' : `${unreadCount} new`}</small>
                  </div>

                  {notifications.length > 0 ? (
                    <div className="notification-list">
                      {notifications.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`notification-item ${
                            readNotificationIds.includes(item.id) ? 'read' : 'unread'
                          }`}
                          onClick={() => {
                            markNotificationsRead([item.id]);
                            setNotificationsOpen(false);
                            navigate(item.path);
                          }}
                        >
                          <strong>{item.title}</strong>
                          <span>{item.detail}</span>
                          <small>Open details</small>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="notification-empty">
                      <strong>All clear</strong>
                      <span>No new updates yet. New account, goal, or recurring activity will appear here.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div ref={profileMenuRef} className="topbar-profile">
              <button
                type="button"
                className="topbar-user"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((prev) => !prev)}
              >
                <span className="topbar-avatar" aria-hidden="true">
                  {(profileInfo?.displayName || 'FT')
                    .split(' ')
                    .map((segment: string) => segment[0] ?? '')
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <span className="topbar-user-copy">
                  <span className="topbar-user-name">
                    {profileInfo?.displayName ?? 'Your profile'}
                  </span>
                  <small>{profileInfo?.email ?? 'Manage account'}</small>
                </span>
              </button>
              {profileMenuOpen && (
                <div className="topbar-profile-menu" role="menu">
                  {profileInfo && (
                    <div className="topbar-profile-menu-info">
                      <strong>{profileInfo.displayName}</strong>
                      <span>{profileInfo.email}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    className="topbar-profile-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate('/settings#profile-section');
                    }}
                  >
                    Update profile
                  </button>
                  <button
                    type="button"
                    className="topbar-profile-menu-item"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
