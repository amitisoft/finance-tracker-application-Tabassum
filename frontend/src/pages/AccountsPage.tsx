import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import Modal from '../components/common/Modal';
import { useAccountsModalStore } from '../features/accounts/accountsModalStore';
import { useAccountsQuery, useTransfer, useUpdateAccount, useDeleteAccount } from '../hooks/useAccounts';
import { useAccountMembers, useInviteAccountMember, useUpdateAccountMemberRole } from '../hooks/useAccountMembers';
import type { AccountRole, TransferPayload, UpdateAccountPayload } from '../types/account';
import { getErrorMessage } from '../utils/errors';
import './AccountsPage.css';

const ACCOUNT_TYPES = [
  { value: 'BANK_ACCOUNT', label: 'Bank account' },
  { value: 'CREDIT_CARD', label: 'Credit card' },
  { value: 'CASH_WALLET', label: 'Cash wallet' },
  { value: 'SAVINGS_ACCOUNT', label: 'Savings account' },
] as const;

const updateSchema = z.object({
  name: z.string().trim().min(2, 'Account name is required'),
  type: z.enum(['BANK_ACCOUNT', 'CREDIT_CARD', 'CASH_WALLET', 'SAVINGS_ACCOUNT']),
  currency: z.string().trim().regex(/^[A-Z]{3}$/, 'Use ISO currency code like INR'),
  currentBalance: z.number().min(0, 'Current balance cannot be negative'),
  institutionName: z.string().optional(),
});

const transferSchema = z
  .object({
    fromAccountId: z.number().int().positive('Select a source account'),
    toAccountId: z.number().int().positive('Select a destination account'),
    amount: z.number().gt(0, 'Transfer amount must be positive'),
  })
  .refine((values) => values.fromAccountId !== values.toAccountId, {
    message: 'Destination account must differ from source',
    path: ['toAccountId'],
  });

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

type Feedback = {
  message: string;
  intent: 'success' | 'error';
};

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);

const formatAccountType = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(' ');

const formatBalanceSummary = (accounts: { currency: string; currentBalance: number }[]) => {
  const totals = accounts.reduce<Record<string, number>>((acc, account) => {
    const currency = account.currency.toUpperCase();
    acc[currency] = (acc[currency] ?? 0) + account.currentBalance;
    return acc;
  }, {});

  const entries = Object.entries(totals);
  if (entries.length === 0) {
    return {
      value: formatMoney(0, 'INR'),
      hint: 'Across all active accounts',
    };
  }

  if (entries.length === 1) {
    const [currency, amount] = entries[0];
    return {
      value: formatMoney(amount, currency),
      hint: 'Across all active accounts',
    };
  }

  return {
    value: entries.map(([currency, amount]) => formatMoney(amount, currency)).join(' | '),
    hint: 'Grouped by currency to avoid mixing balances',
  };
};

const ROLE_LABELS: Record<AccountRole, string> = {
  OWNER: 'Owner',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
};

type RoleBadgeProps = {
  role: AccountRole;
  variant?: 'pill' | 'inline';
};

const RoleBadge = ({ role, variant = 'pill' }: RoleBadgeProps) => (
  <span className={`role-badge role-badge--${role.toLowerCase()} role-badge--${variant}`}>
    {ROLE_LABELS[role]}
  </span>
);

export default function AccountsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useAccountsQuery();
  const { editOpen, transferOpen, editingId, openEdit, openTransfer, closeAll } =
    useAccountsModalStore();
  const updateAccount = useUpdateAccount();
  const transferFunds = useTransfer();
  const deleteAccount = useDeleteAccount();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<Feedback | null>(null);
  const [sharingAccountId, setSharingAccountId] = useState<number | null>(null);
  const [sharingFeedback, setSharingFeedback] = useState<Feedback | null>(null);

  const accounts = data ?? [];
  const hasAccounts = accounts.length > 0;

  const editingAccount = useMemo(
    () => accounts.find((account) => account.id === editingId),
    [accounts, editingId]
  );

  const balanceSummary = useMemo(() => formatBalanceSummary(accounts), [accounts]);
  const bankCount = accounts.filter((account) => account.type === 'BANK_ACCOUNT').length;
  const savingsCount = accounts.filter((account) => account.type === 'SAVINGS_ACCOUNT').length;
  const cashCount = accounts.filter((account) => account.type === 'CASH_WALLET').length;
  const loadError = isError ? getErrorMessage(error, 'Unable to load accounts') : null;

  const {
    register: registerUpdate,
    handleSubmit: handleUpdate,
    formState: { errors: updateErrors, isSubmitting: isUpdating },
    reset: resetUpdate,
  } = useForm<UpdateAccountPayload>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      name: '',
      type: 'BANK_ACCOUNT',
      currency: 'INR',
      currentBalance: 0,
      institutionName: '',
    },
  });

  const {
    register: registerTransfer,
    handleSubmit: handleTransferSubmit,
    formState: { errors: transferErrors, isSubmitting: isTransferring },
    reset: resetTransfer,
  } = useForm<TransferPayload>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromAccountId: 0,
      toAccountId: 0,
      amount: 0,
    },
  });

  const {
    register: registerInvite,
    handleSubmit: handleInviteSubmit,
    formState: { errors: inviteErrors, isSubmitting: isInviting },
    reset: resetInvite,
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'VIEWER',
    },
  });

  const {
    data: sharingMembers,
    isLoading: sharingMembersLoading,
    isError: sharingMembersError,
    refetch: refetchSharingMembers,
  } = useAccountMembers(sharingAccountId ?? undefined);
  const inviteMember = useInviteAccountMember();
  const updateMemberRole = useUpdateAccountMemberRole();

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timer = window.setTimeout(() => setFeedback(null), 4500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!deleteFeedback) {
      return;
    }
    const timer = window.setTimeout(() => setDeleteFeedback(null), 3500);
    return () => window.clearTimeout(timer);
  }, [deleteFeedback]);

  useEffect(() => {
    if (!editOpen) {
      resetUpdate({
        name: '',
        type: 'BANK_ACCOUNT',
        currency: 'INR',
        currentBalance: 0,
        institutionName: '',
      });
    }
  }, [editOpen, resetUpdate]);

  useEffect(() => {
    if (!transferOpen) {
      resetTransfer({
        fromAccountId: 0,
        toAccountId: 0,
        amount: 0,
      });
    }
  }, [transferOpen, resetTransfer]);

  useEffect(() => {
    if (!editingAccount) {
      return;
    }

    resetUpdate({
      name: editingAccount.name,
      type: editingAccount.type,
      currency: editingAccount.currency,
      currentBalance: editingAccount.currentBalance,
      institutionName: editingAccount.institutionName ?? '',
    });
  }, [editingAccount, resetUpdate]);

  const sharingAccount = accounts.find((account) => account.id === sharingAccountId);
  const currentSharingMember = sharingMembers?.find((member) => member.currentUser);
  const sharingRole = currentSharingMember?.role ?? sharingAccount?.currentUserRole ?? 'OWNER';
  const canManageSharing = sharingRole === 'OWNER';

  const openSharing = (accountId: number) => {
    setSharingAccountId(accountId);
    setSharingFeedback(null);
    resetInvite();
  };

  const closeSharing = () => {
    setSharingAccountId(null);
    setSharingFeedback(null);
    resetInvite();
  };

  const onInviteMember = handleInviteSubmit(async (values) => {
    if (!sharingAccountId) {
      return;
    }
    try {
      await inviteMember.mutateAsync({
        accountId: sharingAccountId,
        payload: values,
      });
      setSharingFeedback({ message: 'Member invited', intent: 'success' });
      resetInvite();
      refetchSharingMembers();
    } catch (apiError) {
      setSharingFeedback({
        message: getErrorMessage(apiError, 'Unable to invite member'),
        intent: 'error',
      });
    }
  });

  const handleRoleChange = async (memberId: number, role: AccountRole) => {
    if (!sharingAccountId || !canManageSharing) {
      return;
    }
    try {
      await updateMemberRole.mutateAsync({
        accountId: sharingAccountId,
        userId: memberId,
        payload: { role },
      });
      setSharingFeedback({ message: 'Role updated', intent: 'success' });
      refetchSharingMembers();
    } catch (apiError) {
      setSharingFeedback({
        message: getErrorMessage(apiError, 'Unable to update role'),
        intent: 'error',
      });
    }
  };

  const onUpdateAccount = handleUpdate(async (values) => {
    if (!editingAccount) {
      return;
    }

    try {
      await updateAccount.mutateAsync({
        id: editingAccount.id,
        payload: {
          ...values,
          currency: values.currency.toUpperCase(),
        },
      });
      setFeedback({ message: 'Account updated successfully', intent: 'success' });
      closeAll();
    } catch (apiError) {
      setFeedback({
        message: getErrorMessage(apiError, 'Unable to update account'),
        intent: 'error',
      });
    }
  });

  const requestAccountDelete = async (accountId: number) => {
    if (!window.confirm('Remove this account from the workspace?')) {
      return;
    }

    try {
      await deleteAccount.mutateAsync(accountId);
      setDeleteFeedback({ message: 'Account deleted', intent: 'success' });
    } catch (apiError) {
      setDeleteFeedback({
        message: getErrorMessage(apiError, 'Unable to delete account'),
        intent: 'error',
      });
    }
  };

  const onTransfer = handleTransferSubmit(async (values) => {
    try {
      await transferFunds.mutateAsync(values);
      setFeedback({ message: 'Transfer completed successfully', intent: 'success' });
      closeAll();
      resetTransfer({
        fromAccountId: 0,
        toAccountId: 0,
        amount: 0,
      });
    } catch (apiError) {
      setFeedback({
        message: getErrorMessage(apiError, 'Transfer failed'),
        intent: 'error',
      });
    }
  });

  return (
    <section className="page-panel accounts-page">
      <header className="accounts-header">
        <div className="accounts-header-copy">
          <h2>Accounts</h2>
          <p>Track balances across bank, credit, cash, and savings accounts.</p>
        </div>

        <div className="accounts-header-actions">
          <button
            type="button"
            className="ghost-btn accounts-action-btn"
            onClick={openTransfer}
            disabled={accounts.length < 2}
          >
            Transfer Funds
          </button>

          <button
            type="button"
            className="primary-btn accounts-action-btn"
            onClick={() => navigate('/accounts/new')}
          >
            + Create Account
          </button>
        </div>
      </header>

      {feedback && (
        <p className={`feedback ${feedback.intent === 'error' ? 'error' : ''}`}>
          {feedback.message}
        </p>
      )}

      {loadError && <p className="feedback error">{loadError}</p>}

      <div className="accounts-summary-grid">
        <article className="accounts-summary-card">
          <span className="summary-label">Total accounts</span>
          <strong>{accounts.length}</strong>
          <p>All tracked account records</p>
        </article>

        <article className="accounts-summary-card">
          <span className="summary-label">Balance overview</span>
          <strong>{balanceSummary.value}</strong>
          <p>{balanceSummary.hint}</p>
        </article>

        <article className="accounts-summary-card">
          <span className="summary-label">Bank accounts</span>
          <strong>{bankCount}</strong>
          <p>Primary transaction accounts</p>
        </article>

        <article className="accounts-summary-card">
          <span className="summary-label">Cash and savings</span>
          <strong>{cashCount + savingsCount}</strong>
          <p>Reserve and wallet accounts</p>
        </article>
      </div>

      {isLoading ? (
        <div className="accounts-empty">
          <p>Loading accounts...</p>
          <small>Fetching your latest account balances.</small>
        </div>
      ) : !hasAccounts ? (
        <div className="accounts-empty">
          <p>No accounts created yet.</p>
          <small>Create your first account to start tracking balances.</small>
          <button type="button" className="primary-btn" onClick={() => navigate('/accounts/new')}>
            + Create Account
          </button>
        </div>
      ) : (
        <div className="accounts-list">
          {accounts.map((account) => {
            const accountRole: AccountRole = account.currentUserRole ?? 'OWNER';
            const isOwner = accountRole === 'OWNER';
            const canTransferAccount = accountRole !== 'VIEWER';
            return (
              <article key={account.id} className="account-card">
                <div className="account-card-top">
                  <div>
                    <strong>{account.name}</strong>
                    <p className="account-subtitle">
                      {formatAccountType(account.type)} -{' '}
                      {account.institutionName?.trim() || 'No institution selected'}
                    </p>
                    <small className="account-updated">
                      Updated {new Date(account.lastUpdatedAt).toLocaleDateString()}
                    </small>
                  </div>

                  <span className="account-type-badge">{formatAccountType(account.type)}</span>
                </div>

                <div className="account-balance-row">
                  <div>
                    <span className="balance-label">Current balance</span>
                    <div className="account-balance">
                      {formatMoney(account.currentBalance, account.currency)}
                    </div>
                  </div>

                  <div className="account-actions">
                    <button
                      type="button"
                      className="ghost-btn account-mini-btn"
                      onClick={() => openEdit(account.id)}
                      disabled={!isOwner}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="ghost-btn account-mini-btn"
                      onClick={openTransfer}
                      disabled={accounts.length < 2 || !canTransferAccount}
                    >
                      Transfer
                    </button>
                  </div>
                </div>

                <div className="account-sharing-row">
                  <div>
                    <span className="sharing-label">Your role</span>
                    <RoleBadge role={accountRole} />
                  </div>
                  <button
                    type="button"
                    className="ghost-btn account-mini-btn"
                    onClick={() => openSharing(account.id)}
                  >
                    Share
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {deleteFeedback && (
        <div className={`feedback ${deleteFeedback.intent === 'error' ? 'error' : ''}`} role="status">
          {deleteFeedback.message}
        </div>
      )}

      <Modal open={editOpen} title="Edit account" onClose={closeAll}>
        <form onSubmit={onUpdateAccount} className="form-stack">
          <label>
            Account name
            <input type="text" {...registerUpdate('name')} />
            {updateErrors.name && <span className="form-help">{updateErrors.name.message}</span>}
          </label>

          <label>
            Account type
            <select {...registerUpdate('type')}>
              {ACCOUNT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Currency code
            <input type="text" maxLength={3} {...registerUpdate('currency')} />
            {updateErrors.currency && (
              <span className="form-help">{updateErrors.currency.message}</span>
            )}
          </label>

          <label>
            Current balance
            <input
              type="number"
              step="0.01"
              {...registerUpdate('currentBalance', { valueAsNumber: true })}
            />
            {updateErrors.currentBalance && (
              <span className="form-help">{updateErrors.currentBalance.message}</span>
            )}
          </label>

          <label>
            Institution name
            <input type="text" {...registerUpdate('institutionName')} />
          </label>

          <button disabled={isUpdating} type="submit">
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </Modal>

      <Modal open={transferOpen} title="Transfer funds" onClose={closeAll}>
        <form onSubmit={onTransfer} className="form-stack">
          <label>
            From account
            <select {...registerTransfer('fromAccountId', { valueAsNumber: true })}>
              <option value={0}>Select source</option>
              {accounts.map((account) => (
                <option key={`from-${account.id}`} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            {transferErrors.fromAccountId && (
              <span className="form-help">{transferErrors.fromAccountId.message}</span>
            )}
          </label>

          <label>
            To account
            <select {...registerTransfer('toAccountId', { valueAsNumber: true })}>
              <option value={0}>Select destination</option>
              {accounts.map((account) => (
                <option key={`to-${account.id}`} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            {transferErrors.toAccountId && (
              <span className="form-help">{transferErrors.toAccountId.message}</span>
            )}
          </label>

          <label>
            Amount
            <input
              type="number"
              step="0.01"
              {...registerTransfer('amount', { valueAsNumber: true })}
            />
            {transferErrors.amount && (
              <span className="form-help">{transferErrors.amount.message}</span>
            )}
          </label>

          <button disabled={isTransferring} type="submit">
            {isTransferring ? 'Transferring...' : 'Transfer Funds'}
          </button>
        </form>
      </Modal>

      <Modal
        open={Boolean(sharingAccountId)}
        title={sharingAccount ? `Sharing · ${sharingAccount.name}` : 'Sharing settings'}
        onClose={closeSharing}
      >
        <div className="sharing-modal">
          {sharingFeedback && (
            <p className={`feedback ${sharingFeedback.intent === 'error' ? 'error' : ''}`} role="status">
              {sharingFeedback.message}
            </p>
          )}
          <div className="sharing-headline">
            <p>
              You are{' '}
              <RoleBadge role={sharingRole} variant="inline" /> for this account.
            </p>
            {canManageSharing ? (
              <p className="sharing-hint">Owners can invite and adjust member roles.</p>
            ) : (
              <p className="sharing-hint">Viewers can only observe the member list.</p>
            )}
          </div>

          {sharingMembersLoading ? (
            <p className="sharing-state">Loading members…</p>
          ) : sharingMembersError ? (
            <p className="sharing-state error">Unable to load members.</p>
          ) : sharingMembers && sharingMembers.length > 0 ? (
            <div className="sharing-members">
              {sharingMembers.map((member) => (
                <div key={member.userId} className="sharing-member-row">
                  <div>
                    <strong>{member.displayName || member.email}</strong>
                    <p>{member.email}</p>
                  </div>
                  <div className="sharing-member-actions">
                    <RoleBadge role={member.role} variant="inline" />
                    {canManageSharing && !member.currentUser && (
                      <select
                        value={member.role}
                        onChange={(event) => handleRoleChange(member.userId, event.target.value as AccountRole)}
                      >
                        <option value="OWNER">Owner</option>
                        <option value="EDITOR">Editor</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="sharing-state">Only you have access to this account.</p>
          )}

          {canManageSharing && (
            <form onSubmit={onInviteMember} className="form-stack share-invite-form">
              <label>
                Email
                <input type="email" placeholder="user@example.com" {...registerInvite('email')} />
                {inviteErrors.email && <span className="form-help">{inviteErrors.email.message}</span>}
              </label>

              <label>
                Role
                <select {...registerInvite('role')}>
                  <option value="OWNER">Owner</option>
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                {inviteErrors.role && <span className="form-help">{inviteErrors.role.message}</span>}
              </label>

              <button type="submit" disabled={isInviting}>
                {isInviting ? 'Inviting…' : 'Send invite'}
              </button>
            </form>
          )}
        </div>
      </Modal>
    </section>
  );
}
