import { apiClient } from './api';
import type {
  AccountMemberDto,
  AccountRole,
  InviteAccountMemberPayload,
  UpdateAccountMemberRolePayload,
} from '../types/account';

type AccountMemberApiDto = {
  user_id: number;
  email: string;
  display_name: string;
  role: AccountRole;
  invited_by_id?: number | null;
  invited_by_name?: string | null;
  current_user?: boolean;
};

const normalizeMember = (member: AccountMemberApiDto): AccountMemberDto => ({
  userId: member.user_id,
  email: member.email,
  displayName: member.display_name,
  role: member.role,
  invitedById: member.invited_by_id ?? undefined,
  invitedByName: member.invited_by_name ?? undefined,
  currentUser: member.current_user ?? false,
});

export const accountMembersApi = {
  list: (accountId: number) =>
    apiClient.get<AccountMemberApiDto[]>(`/accounts/${accountId}/members`).then((res) =>
      res.data.map(normalizeMember)
    ),
  invite: (accountId: number, payload: InviteAccountMemberPayload) =>
    apiClient.post<AccountMemberApiDto>(`/accounts/${accountId}/invite`, payload).then((res) =>
      normalizeMember(res.data)
    ),
  updateRole: (accountId: number, userId: number, payload: UpdateAccountMemberRolePayload) =>
    apiClient
      .put<AccountMemberApiDto>(`/accounts/${accountId}/members/${userId}`, payload)
      .then((res) => normalizeMember(res.data)),
};
