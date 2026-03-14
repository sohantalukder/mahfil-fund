'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { cn } from '@/lib/utils';

export type DonationFormValues = {
  donorId: string;
  donorFullName: string;
  donorPhone: string;
  amount: string;
  paymentMethod: string;
  donationDate: string;
  note: string;
};

const BLANK: DonationFormValues = {
  donorId: '',
  donorFullName: '',
  donorPhone: '',
  amount: '',
  paymentMethod: 'CASH',
  donationDate: new Date().toISOString().slice(0, 10),
  note: '',
};

export type DonorOption = { id: string; fullName: string; phone: string };

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Partial<DonationFormValues>;
  donors: DonorOption[];
  donorsLoading: boolean;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: DonationFormValues, useExistingDonor: boolean) => void;
};

function handlePhoneFormat(raw: string): string {
  let v = raw.replace(/[^\d+]/g, '');
  if (!v.startsWith('+880')) {
    if (v.startsWith('880')) v = `+${v}`;
    else if (v.startsWith('0')) v = `+880${v.slice(1)}`;
    else if (!v.startsWith('+')) v = `+880${v}`;
  }
  return v;
}

export function DonationFormModal({
  open,
  mode,
  initial,
  donors,
  donorsLoading,
  loading,
  error,
  onClose,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<DonationFormValues>({ ...BLANK, ...initial });
  const [useExistingDonor, setUseExistingDonor] = useState(true);
  const [donorSearch, setDonorSearch] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...BLANK, ...initial });
      setUseExistingDonor(true);
      setDonorSearch('');
      setSubmitAttempted(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof DonationFormValues>(k: K, v: DonationFormValues[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  const filteredDonors = useMemo(() => {
    const q = donorSearch.trim().toLowerCase();
    if (!q) return donors;
    return donors.filter(
      (d) => d.fullName.toLowerCase().includes(q) || d.phone.toLowerCase().includes(q),
    );
  }, [donors, donorSearch]);

  const amountValue = parseFloat(form.amount);
  const amountInvalid = Number.isNaN(amountValue) || amountValue <= 0;
  const selectedDonor = donors.find((d) => d.id === form.donorId) ?? null;

  function handleSubmit() {
    setSubmitAttempted(true);
    if (useExistingDonor && !form.donorId) return;
    if (!useExistingDonor && (!form.donorFullName.trim() || !form.donorPhone.trim())) return;
    if (amountInvalid) return;
    onSubmit(form, useExistingDonor);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? t('admin.forms.donation.addTitle') : t('admin.forms.donation.editTitle')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? t('admin.forms.donation.addDesc') : t('admin.forms.donation.editDesc')}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-destructive text-xs">{error}</p>
        )}

        <div className={styles.field}>
          <label className={styles.label}>{t('admin.forms.donation.donor')}</label>
          {mode === 'create' && (
            <div className={cn(styles.tabRow, 'mb-2')}>
              <button
                type="button"
                className={`${styles.tab} ${useExistingDonor ? styles.tabActive : ''}`}
                onClick={() => { setUseExistingDonor(true); set('donorFullName', ''); set('donorPhone', ''); }}
              >
                {t('admin.forms.donation.existingDonor')}
              </button>
              <button
                type="button"
                className={`${styles.tab} ${!useExistingDonor ? styles.tabActive : ''}`}
                onClick={() => { setUseExistingDonor(false); set('donorId', ''); setDonorSearch(''); }}
              >
                {t('admin.forms.donation.newDonor')}
              </button>
            </div>
          )}

          {useExistingDonor ? (
            <div className="flex flex-col gap-1.5">
              <Input
                placeholder={t('admin.forms.donation.searchDonorPlaceholder')}
                value={donorSearch}
                onChange={(e) => setDonorSearch(e.target.value)}
                disabled={donorsLoading || donors.length === 0}
              />
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-1">
                {donorsLoading ? (
                  <div className="p-2 text-xs text-muted-foreground">{t('admin.forms.donation.loadingDonors')}</div>
                ) : filteredDonors.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground">
                    {t('admin.forms.donation.noDonorsCreateNew')}{' '}
                    <button
                      type="button"
                      className="bg-transparent border-0 text-primary cursor-pointer underline"
                      onClick={() => { setUseExistingDonor(false); set('donorId', ''); }}
                    >
                      {t('admin.forms.donation.createNew')}
                    </button>
                  </div>
                ) : filteredDonors.map((d) => {
                  const selected = form.donorId === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => set('donorId', d.id)}
                      className={cn(
                        'w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs text-left border transition-colors',
                        selected
                          ? 'border-primary bg-primary/10'
                          : 'border-transparent bg-transparent hover:bg-muted/50',
                      )}
                    >
                      <div>
                        <span className="font-medium text-foreground">{d.fullName}</span>
                        <span className="ml-2 text-[11px] text-muted-foreground">{d.phone}</span>
                      </div>
                      {selected && <span className="text-[11px] text-primary font-semibold">✓</span>}
                    </button>
                  );
                })}
              </div>
              {selectedDonor && (
                <p className="text-[11px] text-muted-foreground">
                  {t('admin.forms.donation.selected')} <strong>{selectedDonor.fullName}</strong> ({selectedDonor.phone})
                </p>
              )}
              {submitAttempted && !form.donorId && (
                <p className={styles.fieldError}>{t('admin.forms.donation.selectDonorError')}</p>
              )}
            </div>
          ) : (
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t('admin.forms.donor.fullName')}</label>
                <Input
                  value={form.donorFullName}
                  onChange={(e) => set('donorFullName', e.target.value)}
                  placeholder="e.g. Abdullah-Al-Mamun"
                />
                {submitAttempted && !form.donorFullName.trim() && (
                  <p className={styles.fieldError}>{t('admin.forms.event.fullNameRequired')}</p>
                )}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t('admin.forms.donor.phone')}</label>
                <Input
                  type="tel"
                  value={form.donorPhone}
                  onChange={(e) => set('donorPhone', handlePhoneFormat(e.target.value))}
                  placeholder="+880 1XXXXXXXXX"
                />
                {submitAttempted && !form.donorPhone.trim() && (
                  <p className={styles.fieldError}>{t('admin.forms.event.phoneRequired')}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('admin.forms.donation.amountBdt')}</label>
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-2 rounded-lg border border-border bg-muted text-xs shrink-0">৳</span>
            <Input
              type="number"
              min={0}
              step={1}
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0.00"
              className="flex-1"
            />
          </div>
          {submitAttempted && amountInvalid && (
            <p className={styles.fieldError}>{t('admin.forms.donation.amountError')}</p>
          )}
        </div>

        <div className={styles.formRow}>
          <div className={styles.field}>
            <label className={styles.label}>{t('donations.paymentMethod')} *</label>
            <select
              className={styles.nativeSelect}
              value={form.paymentMethod}
              onChange={(e) => set('paymentMethod', e.target.value)}
            >
              <option value="">{t('admin.forms.donation.selectMethod')}</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('donations.date')} *</label>
            <Input
              type="date"
              value={form.donationDate}
              onChange={(e) => set('donationDate', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('admin.forms.donation.noteOptional')}</label>
          <textarea
            className={cn(styles.nativeSelect, 'resize-y min-h-[72px] [font-family:inherit]')}
            rows={3}
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            placeholder={t('admin.forms.donation.notePlaceholder')}
          />
        </div>

        <div className={styles.formActions}>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading
              ? t('admin.ui.saving')
              : mode === 'create'
                ? t('admin.forms.donation.addDonation')
                : t('admin.forms.event.saveChanges')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
