import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountMembersApi } from '../services/accountMembers';
import type {
  AccountMemberDto,
  InviteAccountMemberPayload,
  UpdateAccountMemberRolePayload,
} from '../types/account';

type MembersMutationArgs = {
  accountId: number;
  payload: InviteAccountMemberPayload;
};

type UpdateRoleArgs = {
  accountId: number;
  userId: number;
  payload: UpdateAccountMemberRolePayload;
};

export const useAccountMembers = (accountId?: number) =>
  useQuery<AccountMemberDto[]>({
    queryKey: ['account-members', accountId],
    queryFn: () => (accountId ? accountMembersApi.list(accountId) : Promise.resolve([])),
    enabled: Boolean(accountId),
    staleTime: 1000 * 60 * 5,
  });

export const useInviteAccountMember = () => {
  const queryClient = useQueryClient();
  return useMutation<AccountMemberDto, Error, MembersMutationArgs>({
    mutationFn: ({ accountId, payload }) => accountMembersApi.invite(accountId, payload),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: ['account-members', accountId] });
    },
  });
};

export const useUpdateAccountMemberRole = () => {
  const queryClient = useQueryClient();
  return useMutation<AccountMemberDto, Error, UpdateRoleArgs>({
    mutationFn: ({ accountId, userId, payload }) =>
      accountMembersApi.updateRole(accountId, userId, payload),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: ['account-members', accountId] });
    },
  });
};
