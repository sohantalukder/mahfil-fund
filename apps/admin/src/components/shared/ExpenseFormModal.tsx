'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PAYMENT_METHODS } from '@/constants/payments';
import styles from '@/styles/form.module.css';

export type ExpenseFormValues = {
  title: string;
  category: string;
  amount: string;
  expenseDate: string;
  paymentMethod: string;
  vendor: string;
  note: string;
};

const BLANK: ExpenseFormValues = {
  title: '',
  category: '',
  amount: '',
  expenseDate: new Date().toISOString().slice(0, 10),
  paymentMethod: 'CASH',
  vendor: '',
  note: '',
};

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Partial<ExpenseFormValues>;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: ExpenseFormValues) => void;
};

export function ExpenseFormModal({ open, mode, initial, loading, error, onClose, onSubmit }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ExpenseFormValues>({ ...BLANK, ...initial });

  useEffect(() => {
    if (open) setForm({ ...BLANK, ...initial });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof ExpenseFormValues>(k: K, v: ExpenseFormValues[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  const canSubmit = !!form.title && !!form.category && !!form.amount && parseFloat(form.amount) > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? t('admin.forms.expense.addTitle') : t('admin.forms.expense.editTitle')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? t('admin.forms.expense.addDesc') : t('admin.forms.expense.editDesc')}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-destructive text-xs">{error}</p>
        )}

        <div className={styles.formGrid}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t('admin.forms.expense.title')}</label>
              <Input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder={t('admin.forms.expense.titlePlaceholder')}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('admin.forms.expense.category')}</label>
              <Input
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                placeholder={t('admin.forms.expense.categoryPlaceholder')}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t('admin.forms.expense.amountBdt')}</label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                placeholder="0"
                min={0}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('admin.forms.expense.date')}</label>
              <Input
                type="date"
                value={form.expenseDate}
                onChange={(e) => set('expenseDate', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t('admin.forms.expense.paymentMethod')}</label>
              <select
                className={styles.nativeSelect}
                value={form.paymentMethod}
                onChange={(e) => set('paymentMethod', e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('admin.forms.expense.vendor')}</label>
              <Input
                value={form.vendor}
                onChange={(e) => set('vendor', e.target.value)}
                placeholder={t('admin.forms.expense.vendorPlaceholder')}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('donors.note')}</label>
          <textarea
            className={`${styles.nativeSelect} resize-y min-h-[72px] [font-family:inherit]`}
            rows={3}
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            placeholder={t('admin.forms.expense.notePlaceholder')}
          />
          </div>
        </div>

        <div className={styles.formActions}>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => onSubmit(form)} disabled={loading || !canSubmit}>
            {loading
              ? t('admin.ui.saving')
              : mode === 'create'
                ? t('admin.forms.expense.addExpense')
                : t('admin.forms.event.saveChanges')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
