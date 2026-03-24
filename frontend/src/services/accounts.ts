import { apiClient } from './api';
import type {
  AccountDto,
  AccountRole,
  CreateAccountPayload,
  TransferPayload,
  UpdateAccountPayload,
} from '../types/account';

const normalizeCurrency = (value: string) => value.trim().toUpperCase();

type AccountApiDto = {
  id: number;
  user_id: number;
  name: string;
  type: AccountDto['type'];
  currency: string;
  opening_balance: number;
  current_balance: number;
  institution_name?: string | null;
  last_updated_at: string;
  current_user_role?: AccountRole;
};

const normalizeAccount = (account: AccountApiDto): AccountDto => ({
  id: account.id,
  userId: account.user_id,
  name: account.name,
  type: account.type,
  currency: account.currency,
  openingBalance: account.opening_balance,
  currentBalance: account.current_balance,
  institutionName: account.institution_name ?? undefined,
  lastUpdatedAt: account.last_updated_at,
  currentUserRole: account.current_user_role ?? undefined,
});

export const accountsApi = {
  list: () => apiClient.get<AccountApiDto[]>('/accounts').then((res) => res.data.map(normalizeAccount)),
  create: (payload: CreateAccountPayload) => {
    const request = { ...payload, currency: normalizeCurrency(payload.currency) };
    return apiClient.post<AccountApiDto>('/accounts', request).then((res) => normalizeAccount(res.data));
  },
  update: (id: number, payload: UpdateAccountPayload) => {
    const request = { ...payload, currency: normalizeCurrency(payload.currency) };
    return apiClient.put<AccountApiDto>(`/accounts/${id}`, request).then((res) => normalizeAccount(res.data));
  },
  transfer: (payload: TransferPayload) =>
    apiClient.post('/accounts/transfer', payload).then(() => undefined),
  delete: (id: number) => apiClient.delete(`/accounts/${id}`).then(() => undefined),
};
