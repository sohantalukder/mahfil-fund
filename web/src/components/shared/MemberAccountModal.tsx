'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROLE_COLOR, formatRole, type RoleName } from '@/constants/roles';
import styles from '@/styles/form.module.css';

export type MemberAccountForm = {
  kind: 'new' | 'existing';
  email: string;
  password: string;
  fullName: string;
  roles: RoleName[];
};

const BLANK_FORM: MemberAccountForm = {
  kind: 'new',
  email: '',
  password: '',
  fullName: '',
  roles: ['viewer'],
};

type Props = {
  open: boolean;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (form: MemberAccountForm) => void;
};

export function MemberAccountModal({ open, loading, error, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<MemberAccountForm>({ ...BLANK_FORM });

  function handleClose() {
    setForm({ ...BLANK_FORM });
    onClose();
  }

  const canSubmit = !!form.email && form.roles.length === 1 && (form.kind === 'existing' || (form.password.length >= 10 && form.fullName.trim().length >= 2));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Community Member</DialogTitle>
          <DialogDescription>Create an account with a temporary password or add an existing account by email.</DialogDescription>
        </DialogHeader>

        {error && <p className="text-destructive text-xs">{error}</p>}

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Account type *</label>
            <select className="db-input" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as MemberAccountForm['kind'] }))}>
              <option value="new">Create new account</option>
              <option value="existing">Add existing account</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email *</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="user@example.com"
            />
          </div>

          {form.kind === 'new' && <div className={styles.field}>
            <label className={styles.label}>Temporary password *</label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Min. 10 characters"
            />
          </div>}

          {form.kind === 'new' && <div className={styles.field}>
            <label className={styles.label}>Full Name</label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="Required"
            />
          </div>}

          <div className={styles.field}>
            <label className={styles.label}>Community role *</label>
            <div className="grid gap-1.5">
              {(['admin', 'collector', 'viewer'] as RoleName[]).map((role) => (
                <label key={role} className="flex items-center gap-2 text-[13px] cursor-pointer">
                  {/* accentColor is a dynamic runtime value from ROLE_COLOR[role] — kept as inline */}
                  <input
                    type="radio"
                    checked={form.roles.includes(role)}
                    onChange={() => setForm((f) => ({ ...f, roles: [role] }))}
                    style={{ accentColor: ROLE_COLOR[role] }}
                  />
                  {/* label color is a dynamic runtime value from ROLE_COLOR[role] — kept as inline */}
                  <span style={{ color: ROLE_COLOR[role] }} className="font-medium">{formatRole(role)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(form)} disabled={loading || !canSubmit}>
            {loading ? 'Saving…' : 'Add Member'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
