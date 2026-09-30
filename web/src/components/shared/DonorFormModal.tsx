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

export type DonorFormValues = {
  fullName: string;
  phone: string;
  altPhone: string;
  address: string;
  donorType: string;
  note: string;
};

const BLANK: DonorFormValues = {
  fullName: '',
  phone: '',
  altPhone: '',
  address: '',
  donorType: 'individual',
  note: '',
};

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Partial<DonorFormValues>;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: DonorFormValues) => void;
};

export function DonorFormModal({ open, mode, initial, loading, error, onClose, onSubmit }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<DonorFormValues>({ ...BLANK, ...initial });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...BLANK, ...initial });
      setSubmitAttempted(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof DonorFormValues>(k: K, v: DonorFormValues[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function handleSubmit() {
    setSubmitAttempted(true);
    if (!form.fullName.trim() || !form.phone.trim()) return;
    onSubmit(form);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? t('admin.forms.donor.addTitle') : t('admin.forms.donor.editTitle')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? t('admin.forms.donor.addDesc') : t('admin.forms.donor.editDesc')}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-destructive text-xs">{error}</p>
        )}

        <div className={styles.formGrid}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t('admin.forms.donor.fullName')}</label>
              <Input
                value={form.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                placeholder={t('admin.forms.donor.fullNamePlaceholder')}
              />
              {submitAttempted && !form.fullName.trim() && (
                <p className={styles.fieldError}>{t('admin.forms.event.fullNameRequired')}</p>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('admin.forms.donor.phone')}</label>
              <Input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder={t('admin.forms.donor.phonePlaceholder')}
              />
              {submitAttempted && !form.phone.trim() && (
                <p className={styles.fieldError}>{t('admin.forms.event.phoneRequired')}</p>
              )}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t('admin.forms.donor.altPhone')}</label>
              <Input
                value={form.altPhone}
                onChange={(e) => set('altPhone', e.target.value)}
                placeholder={t('admin.forms.donor.optionalPlaceholder')}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('admin.forms.donor.donorType')}</label>
              <select
                className={styles.nativeSelect}
                value={form.donorType}
                onChange={(e) => set('donorType', e.target.value)}
              >
                <option value="individual">{t('donors.individual')}</option>
                <option value="family">{t('donors.family')}</option>
                <option value="business">{t('donors.business')}</option>
                <option value="organization">{t('donors.organization')}</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('admin.forms.donor.address')}</label>
            <Input
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder={t('admin.forms.donor.addressPlaceholder')}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('admin.forms.donor.note')}</label>
          <textarea
            className={`${styles.nativeSelect} resize-y min-h-[72px] [font-family:inherit]`}
            rows={3}
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            placeholder={t('admin.forms.donor.notePlaceholder')}
          />
          </div>
        </div>

        <div className={styles.formActions}>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading
              ? t('admin.ui.saving')
              : mode === 'create'
                ? t('admin.forms.donor.addDonor')
                : t('admin.forms.event.saveChanges')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
