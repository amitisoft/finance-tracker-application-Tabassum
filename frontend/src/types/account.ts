export type AccountRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export type AccountMemberDto = {
  userId: number;
  email: string;
  displayName: string;
  role: AccountRole;
  invitedById?: number;
  invitedByName?: string;
  currentUser?: boolean;
};

export type AccountDto = {
  id: number;
  userId: number;
  name: string;
  type: 'BANK_ACCOUNT' | 'CREDIT_CARD' | 'CASH_WALLET' | 'SAVINGS_ACCOUNT';
  currency: string;
  openingBalance: number;
  currentBalance: number;
  institutionName?: string;
  lastUpdatedAt: string;
  currentUserRole?: AccountRole;
};

export type CreateAccountPayload = {
  name: string;
  type: 'BANK_ACCOUNT' | 'CREDIT_CARD' | 'CASH_WALLET' | 'SAVINGS_ACCOUNT';
  currency: string;
  openingBalance: number;
  institutionName?: string;
};

export type UpdateAccountPayload = {
  name: string;
  type: 'BANK_ACCOUNT' | 'CREDIT_CARD' | 'CASH_WALLET' | 'SAVINGS_ACCOUNT';
  currency: string;
  currentBalance: number;
  institutionName?: string;
};

export type TransferPayload = {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
};

export type InviteAccountMemberPayload = {
  email: string;
  role: AccountRole;
};

export type UpdateAccountMemberRolePayload = {
  role: AccountRole;
};

export type Account = AccountDto;
export type CreateAccountRequest = CreateAccountPayload;
export type UpdateAccountRequest = UpdateAccountPayload;
export type TransferRequest = TransferPayload;
