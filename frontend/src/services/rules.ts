import { apiClient } from './api';
import type { CreateRulePayload, RuleDto, UpdateRulePayload } from '../types/rule';

type RuleApi = {
  id: number;
  name: string;
  description?: string | null;
  match_field: RuleDto['matchField'];
  match_operator: RuleDto['matchOperator'];
  match_value: string;
  action: RuleDto['action'];
  category_id?: number | null;
  category_name?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const normalizeRule = (payload: RuleApi): RuleDto => ({
  id: payload.id,
  name: payload.name,
  description: payload.description ?? undefined,
  matchField: payload.match_field,
  matchOperator: payload.match_operator,
  matchValue: payload.match_value,
  action: payload.action,
  categoryId: payload.category_id ?? undefined,
  categoryName: payload.category_name ?? undefined,
  active: payload.active,
  createdAt: payload.created_at,
  updatedAt: payload.updated_at,
});

const toCreatePayload = (payload: CreateRulePayload) => ({
  name: payload.name,
  description: payload.description,
  match_field: payload.matchField,
  match_operator: payload.matchOperator,
  match_value: payload.matchValue,
  action: payload.action,
  category_id: payload.categoryId ?? null,
  active: payload.active ?? true,
});

const toUpdatePayload = (payload: UpdateRulePayload) => ({
  name: payload.name,
  description: payload.description,
  match_field: payload.matchField,
  match_operator: payload.matchOperator,
  match_value: payload.matchValue,
  action: payload.action,
  category_id: payload.categoryId ?? null,
  active: payload.active,
});

export const rulesApi = {
  list: () => apiClient.get<RuleApi[]>('/rules').then((res) => res.data.map(normalizeRule)),
  get: (id: number) => apiClient.get<RuleApi>(`/rules/${id}`).then((res) => normalizeRule(res.data)),
  create: (payload: CreateRulePayload) =>
    apiClient.post<RuleApi>('/rules', toCreatePayload(payload)).then((res) => normalizeRule(res.data)),
  update: (id: number, payload: UpdateRulePayload) =>
    apiClient.put<RuleApi>(`/rules/${id}`, toUpdatePayload(payload)).then((res) => normalizeRule(res.data)),
  delete: (id: number) => apiClient.delete(`/rules/${id}`).then(() => undefined),
};
