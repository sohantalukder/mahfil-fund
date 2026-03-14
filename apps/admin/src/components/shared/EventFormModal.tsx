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
import styles from '@/styles/form.module.css';

export type EventFormValues = {
  name: string;
  year: number | string;
  startsAt: string;
  endsAt: string;
  targetAmount: string;
};

const BLANK: EventFormValues = {
  name: '',
  year: new Date().getFullYear(),
  startsAt: '',
  endsAt: '',
  targetAmount: '',
};

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Partial<EventFormValues>;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: EventFormValues) => void;
};

export function EventFormModal({ open, mode, initial, loading, error, onClose, onSubmit }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<EventFormValues>({ ...BLANK, ...initial });

  useEffect(() => {
    if (open) setForm({ ...BLANK, ...initial });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof EventFormValues>(k: K, v: EventFormValues[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  const canSubmit = !!form.name && !!form.year;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? t('admin.forms.event.newTitle') : t('admin.forms.event.editTitle')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? t('admin.forms.event.newDesc') : t('admin.forms.event.editDesc')}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-destructive text-xs">{error}</p>
        )}

        <div className={styles.formGrid}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t('admin.forms.event.eventName')}</label>
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder={t('admin.forms.event.namePlaceholder')}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('admin.forms.event.year')}</label>
              <Input
                type="number"
                value={form.year}
                onChange={(e) => set('year', e.target.value)}
                min={2000}
                max={2100}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t('admin.forms.event.startDate')}</label>
              <Input
                type="date"
                value={form.startsAt}
                onChange={(e) => set('startsAt', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('admin.forms.event.endDate')}</label>
              <Input
                type="date"
                value={form.endsAt}
                onChange={(e) => set('endsAt', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('admin.forms.event.targetAmountBdt')}</label>
            <Input
              type="number"
              value={form.targetAmount}
              onChange={(e) => set('targetAmount', e.target.value)}
              placeholder="0"
              min={0}
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
                ? t('admin.forms.event.createEvent')
                : t('admin.forms.event.saveChanges')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
