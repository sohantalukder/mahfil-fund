'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ALL_ROLES, ROLE_COLOR, ROLE_PERMS, formatRole, type RoleName } from '@/constants/roles';
import styles from '@/styles/form.module.css';

type Props = {
  open: boolean;
  userName: string;
  selectedRoles: RoleName[];
  loading: boolean;
  onToggleRole: (role: RoleName) => void;
  onSave: () => void;
  onClose: () => void;
};

export function EditRolesModal({
  open,
  userName,
  selectedRoles,
  loading,
  onToggleRole,
  onSave,
  onClose,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Roles — {userName}</DialogTitle>
          <DialogDescription>
            Changes take effect on the user&apos;s next request.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {ALL_ROLES.map((role) => {
            const checked = selectedRoles.includes(role);
            const p = ROLE_PERMS[role];
            const color = ROLE_COLOR[role];
            return (
              <label
                key={role}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg cursor-pointer transition-all"
                style={{
                  // border color and background depend on runtime ROLE_COLOR[role] — kept as inline
                  border: `1.5px solid ${checked ? color : 'var(--color-border)'}`,
                  background: checked ? `${color}11` : 'transparent',
                }}
              >
                {/* width/height + accentColor are dynamic — kept as inline */}
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleRole(role)}
                  className="w-4 h-4"
                  style={{ accentColor: color }}
                />
                <div className="flex-1">
                  {/* text color depends on runtime ROLE_COLOR[role] — kept as inline */}
                  <div className="font-semibold text-sm" style={{ color: checked ? color : undefined }}>
                    {formatRole(role)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {[p.read && 'Read', p.write && 'Write', p.del && 'Delete', p.admin && 'User Admin']
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                {/* checkmark color is dynamic runtime value — kept as inline */}
                {checked && <span className="font-bold" style={{ color }}>✓</span>}
              </label>
            );
          })}
        </div>

        <div className={styles.formActions}>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={loading || selectedRoles.length === 0}>
            {loading ? 'Saving…' : 'Save Roles'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
