import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCategoriesQuery } from '../hooks/useCategories';
import { useCreateRule, useDeleteRule, useRules, useUpdateRule } from '../hooks/useRules';
import type { CreateRulePayload, RuleAction, RuleDto, RuleField, RuleOperator, UpdateRulePayload } from '../types/rule';
import './RulesPage.css';

const fieldOptions: { label: string; value: RuleField }[] = [
  { label: 'Description', value: 'DESCRIPTION' },
  { label: 'Merchant', value: 'MERCHANT' },
  { label: 'Tags', value: 'TAGS' },
];

const operatorOptions: { label: string; value: RuleOperator }[] = [
  { label: 'Contains', value: 'CONTAINS' },
  { label: 'Equals', value: 'EQUALS' },
];

const actionOptions: { label: string; value: RuleAction }[] = [
  { label: 'Assign category', value: 'ASSIGN_CATEGORY' },
  { label: 'Flag for review', value: 'FLAG' },
];

type RuleFormValues = {
  name: string;
  description: string;
  matchField: RuleField;
  matchOperator: RuleOperator;
  matchValue: string;
  action: RuleAction;
  categoryId?: number;
  active: boolean;
};

const defaultValues: RuleFormValues = {
  name: '',
  description: '',
  matchField: 'DESCRIPTION',
  matchOperator: 'CONTAINS',
  matchValue: '',
  action: 'ASSIGN_CATEGORY',
  categoryId: undefined,
  active: true,
};

const buildPayload = (values: RuleFormValues): CreateRulePayload => ({
  name: values.name.trim(),
  description: values.description?.trim() || undefined,
  matchField: values.matchField,
  matchOperator: values.matchOperator,
  matchValue: values.matchValue.trim(),
  action: values.action,
  categoryId: values.action === 'ASSIGN_CATEGORY' ? values.categoryId : undefined,
  active: values.active,
});

const buildUpdatePayload = (rule: RuleDto, overrides: Partial<UpdateRulePayload> = {}): UpdateRulePayload => ({
  name: overrides.name ?? rule.name,
  description: overrides.description ?? rule.description,
  matchField: overrides.matchField ?? rule.matchField,
  matchOperator: overrides.matchOperator ?? rule.matchOperator,
  matchValue: overrides.matchValue ?? rule.matchValue,
  action: overrides.action ?? rule.action,
  categoryId: overrides.categoryId ?? rule.categoryId,
  active: overrides.active ?? rule.active,
});

export default function RulesPage() {
  const rulesQuery = useRules();
  const categoriesQuery = useCategoriesQuery();
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();

  const [editingRule, setEditingRule] = useState<RuleDto | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RuleFormValues>({
    defaultValues,
    mode: 'onSubmit',
  });

  const watchingAction = watch('action');

  useEffect(() => {
    if (createRule.isSuccess || updateRule.isSuccess) {
      reset(defaultValues);
      setEditingRule(null);
    }
  }, [createRule.isSuccess, reset, updateRule.isSuccess]);

  const rules = rulesQuery.data ?? [];

  const sortedRules = useMemo(() => [...rules].sort((a, b) => a.name.localeCompare(b.name)), [rules]);

  const handleSave = handleSubmit((values) => {
    const payload = buildPayload(values);
    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, payload });
    } else {
      createRule.mutate(payload);
    }
  });

  const handleEdit = (rule: RuleDto) => {
    setEditingRule(rule);
    reset({
      name: rule.name,
      description: rule.description ?? '',
      matchField: rule.matchField,
      matchOperator: rule.matchOperator,
      matchValue: rule.matchValue,
      action: rule.action,
      categoryId: rule.categoryId,
      active: rule.active,
    });
  };

  const handleToggleActive = (rule: RuleDto) => {
    updateRule.mutate({ id: rule.id, payload: buildUpdatePayload(rule, { active: !rule.active }) });
  };

  const handleDelete = (id: number) => {
    deleteRule.mutate(id);
  };

  const isMutating = createRule.isPending || updateRule.isPending;
  const canSubmit = !isSubmitting && !isMutating;

  return (
    <div className="rules-page">
      <section className="rules-panel">
        <header className="rules-panel-head">
          <div>
            <h1>Rules engine</h1>
            <p>Automate categorization and flag transactions using simple match rules.</p>
          </div>
          <div className="rules-summary">
            <span>Total rules</span>
            <strong>{rules.length}</strong>
          </div>
        </header>

        <div className="rules-grid">
          <div className="rules-list">
            <div className="rules-list-head">
              <h2>Existing rules</h2>
              {rulesQuery.isLoading && <span className="rules-loading">Loading…</span>}
            </div>

            {rulesQuery.isError && (
              <div className="rules-empty">
                <p>Unable to load rules.</p>
              </div>
            )}

            {!rulesQuery.isLoading && sortedRules.length === 0 && (
              <div className="rules-empty">
                <p>No automation rules yet. Use the form to the right to add one.</p>
              </div>
            )}

            <div className="rules-list-body">
              {sortedRules.map((rule) => (
                <article key={rule.id} className={`rule-row ${rule.active ? '' : 'rule-paused'}`}>
                  <div>
                    <header className="rule-row-head">
                      <strong>{rule.name}</strong>
                      <span className="rule-status">{rule.active ? 'Active' : 'Paused'}</span>
                    </header>
                    <p className="rule-meta">
                      <span className="rule-badge">{rule.matchField}</span>
                      {rule.matchOperator.toLowerCase()} “{rule.matchValue}”
                    </p>
                    <p className="rule-action">
                      {rule.action === 'ASSIGN_CATEGORY'
                        ? `Assign to ${rule.categoryName ?? 'category'}`
                        : 'Flag for review'}
                    </p>
                  </div>
                  <div className="rule-actions">
                    <button type="button" onClick={() => handleEdit(rule)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => handleToggleActive(rule)}>
                      {rule.active ? 'Disable' : 'Enable'}
                    </button>
                    <button type="button" className="rule-delete" onClick={() => handleDelete(rule.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rules-form">
            <h2>{editingRule ? 'Edit rule' : 'New rule'}</h2>
            <form onSubmit={handleSave} className="rule-form">
              <label>
                Name
                <input type="text" {...register('name', { required: true })} />
                {errors.name && <span className="field-error">{errors.name.message}</span>}
              </label>

              <label>
                Description (optional)
                <textarea {...register('description')} rows={2} />
              </label>

              <label>
                Match field
                <select {...register('matchField', { required: true })}>
                  {fieldOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Operator
                <select {...register('matchOperator', { required: true })}>
                  {operatorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Match value
                <input type="text" {...register('matchValue', { required: true })} />
                {errors.matchValue && <span className="field-error">{errors.matchValue.message}</span>}
              </label>

              <label>
                Action
                <select {...register('action', { required: true })}>
                  {actionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {watchingAction === 'ASSIGN_CATEGORY' && (
                <label>
                  Category
                  <select
                    {...register('categoryId', {
                      required: watchingAction === 'ASSIGN_CATEGORY',
                      valueAsNumber: true,
                    })}
                  >
                    <option value="">Select category</option>
                    {(categoriesQuery.data ?? []).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && <span className="field-error">Category is required</span>}
                </label>
              )}

              <label className="checkbox-field">
                <input type="checkbox" {...register('active')} />
                Active
              </label>

              <div className="form-actions">
                <button type="submit" disabled={!canSubmit}>
                  {editingRule ? 'Save changes' : 'Add rule'}
                </button>
                {editingRule && (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      reset(defaultValues);
                      setEditingRule(null);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>

              {(createRule.error || updateRule.error) && (
                <p className="field-error">
                  {(createRule.error ?? updateRule.error)?.message ?? 'Unable to save rule'}
                </p>
              )}
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
