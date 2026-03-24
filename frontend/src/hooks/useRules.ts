import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rulesApi } from '../services/rules';
import type { CreateRulePayload, RuleDto, UpdateRulePayload } from '../types/rule';

const rulesKey = ['rules'];

export const useRules = () =>
  useQuery<RuleDto[]>({
    queryKey: rulesKey,
    queryFn: () => rulesApi.list(),
    staleTime: 1000 * 60 * 2,
  });

const invalidateRules = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: rulesKey });
};

export const useCreateRule = () => {
  const queryClient = useQueryClient();
  return useMutation<RuleDto, Error, CreateRulePayload>({
    mutationFn: (payload) => rulesApi.create(payload),
    onSuccess: () => invalidateRules(queryClient),
  });
};

export const useUpdateRule = () => {
  const queryClient = useQueryClient();
  return useMutation<RuleDto, Error, { id: number; payload: UpdateRulePayload }>({
    mutationFn: ({ id, payload }) => rulesApi.update(id, payload),
    onSuccess: () => invalidateRules(queryClient),
  });
};

export const useDeleteRule = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => rulesApi.delete(id),
    onSuccess: () => invalidateRules(queryClient),
  });
};
