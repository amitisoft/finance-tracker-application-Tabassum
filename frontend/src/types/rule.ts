export type RuleField = 'DESCRIPTION' | 'MERCHANT' | 'TAGS';

export type RuleOperator = 'CONTAINS' | 'EQUALS';

export type RuleAction = 'ASSIGN_CATEGORY' | 'FLAG';

export type RuleDto = {
  id: number;
  name: string;
  description?: string;
  matchField: RuleField;
  matchOperator: RuleOperator;
  matchValue: string;
  action: RuleAction;
  categoryId?: number;
  categoryName?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateRulePayload = {
  name: string;
  description?: string;
  matchField: RuleField;
  matchOperator: RuleOperator;
  matchValue: string;
  action: RuleAction;
  categoryId?: number;
  active?: boolean;
};

export type UpdateRulePayload = CreateRulePayload;
