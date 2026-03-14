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
import { ALL_ROLES, ROLE_COLOR, formatRole, type RoleName } from '@/constants/roles';
import styles from '@/styles/form.module.css';

type InviteForm = {
  email: string;
  password: string;
  fullName: string;
  roles: RoleName[];
};

const BLANK_FORM: InviteForm = {
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
  onSubmit: (form: InviteForm) => void;
};

export function InviteUserModal({ open, loading, error, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<InviteForm>({ ...BLANK_FORM });

  function handleClose() {
    setForm({ ...BLANK_FORM });
    onClose();
  }

  function toggleRole(role: RoleName) {
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  }

  const canSubmit = !!form.email && form.password.length >= 8 && form.roles.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>Create a new user account with initial roles.</DialogDescription>
        </DialogHeader>

        {error && <p className="text-destructive text-xs">{error}</p>}

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Email *</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="user@example.com"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password *</label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Min. 8 characters"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Full Name</label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Initial Roles *</label>
            <div className="grid gap-1.5">
              {ALL_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-2 text-[13px] cursor-pointer">
                  {/* accentColor is a dynamic runtime value from ROLE_COLOR[role] — kept as inline */}
                  <input
                    type="checkbox"
                    checked={form.roles.includes(role)}
                    onChange={() => toggleRole(role)}
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
            {loading ? 'Creating…' : 'Create User'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
