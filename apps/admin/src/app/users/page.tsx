'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../components/shell';
import { Button } from '@/components/ui/button';
import { useToast } from '../components/toast';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import {
  useUsers,
  useMe,
  useCreateUser,
  useUpdateUserRoles,
  useToggleUserStatus,
} from '@/hooks/useUsers';
import { TableCard } from '@/components/shared/TableCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { StatGrid, StatCard } from '@/components/shared/StatGrid';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { InviteUserModal } from '@/components/shared/InviteUserModal';
import { EditRolesModal } from '@/components/shared/EditRolesModal';
import { ALL_ROLES, ROLE_COLOR, ROLE_PERMS, formatRole } from '@/constants/roles';
import type { RoleName } from '@/constants/roles';
import type { AppUser } from '@/types';
import styles from './users.module.css';

function getDisplayName(user: AppUser): string {
  const candidate = user.fullName?.trim();
  if (candidate) return candidate;
  if (!user.email) return 'Unknown User';
  const local = user.email.split('@')[0] ?? '';
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim() || user.email;
}

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const { data: usersData, isLoading } = useUsers({
    page,
    pageSize,
    search: debouncedSearch.trim(),
  });
  const { data: me } = useMe();

  const createUser = useCreateUser();
  const updateRoles = useUpdateUserRoles();
  const toggleStatus = useToggleUserStatus();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<AppUser | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<RoleName[]>([]);

  const users = usersData?.users ?? [];
  const total = usersData?.total ?? 0;
  const totalPages = usersData?.totalPages ?? 1;
  const isSuperAdmin = me?.roles.includes('super_admin') ?? false;

  async function handleInvite(form: { email: string; password: string; fullName: string; roles: RoleName[] }) {
    try {
      await createUser.mutateAsync({
        email: form.email,
        password: form.password,
        fullName: form.fullName || null,
        roles: form.roles,
      });
      setInviteOpen(false);
      toast(`User created: ${form.email}`, 'success');
    } catch (err) {
      // error surfaced via createUser.error
    }
  }

  function openRoleEdit(u: AppUser) {
    setSelectedRoles(u.roles as RoleName[]);
    setRoleTarget(u);
  }

  async function handleSaveRoles() {
    if (!roleTarget) return;
    try {
      await updateRoles.mutateAsync({ userId: roleTarget.id, roles: selectedRoles });
      setRoleTarget(null);
      toast('Roles updated', 'success');
    } catch (err) {
      // error surfaced via updateRoles.error
    }
  }

  async function handleToggleStatus(u: AppUser) {
    try {
      await toggleStatus.mutateAsync({ userId: u.id, isActive: !u.isActive });
    } catch (err) {
      toast('Failed to update status', 'error');
    }
  }

  return (
    <PageShell
      title={t('dashboard.usersManagement')}
      subtitle={t('dashboard.usersSubtitle')}
      actions={
        <Button onClick={() => setInviteOpen(true)}>+ Create User</Button>
      }
    >
      <ListToolbar
        searchPlaceholder="Search by name, email, role…"
        searchValue={searchInput}
        onSearchChange={(v) => { setSearchInput(v); setPage(1); }}
      />

      <StatGrid columns={4}>
        {ALL_ROLES.map((role) => (
          <StatCard key={role} label={`${formatRole(role)}s`}>
            {/* color is a dynamic runtime value from ROLE_COLOR[role] — kept as inline */}
            <span style={{ color: ROLE_COLOR[role] }}>
              {users.filter((u) => u.roles.includes(role)).length}
            </span>
          </StatCard>
        ))}
      </StatGrid>

      <TableCard
        title="All Users"
        badge={`${users.length} on page / ${total} total`}
        badgeVariant="blue"
        empty={!isLoading && users.length === 0 ? 'No users found.' : undefined}
      >
        {users.length > 0 && (
          <table className="dataTable">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const displayName = getDisplayName(u);
                const isMe = u.id === me?.id;
                const isToggling = toggleStatus.isPending && toggleStatus.variables?.userId === u.id;
                return (
                  <tr key={u.id} className={!u.isActive ? styles.disabledRow : undefined}>
                    <td>
                      <div className={styles.nameCell}>
                        <UserAvatar name={displayName} size="sm" />
                        <div>
                          <span className={styles.nameText}>{displayName}</span>
                          {isMe && <span className={styles.youBadge}>● you</span>}
                        </div>
                      </div>
                    </td>
                    <td className={styles.email}>{u.email || '—'}</td>
                    <td>
                      <div className={styles.roleList}>
                        {u.roles.length === 0
                          ? <span className={styles.noRoles}>No roles</span>
                          /* badge color is a dynamic runtime value from ROLE_COLOR — kept as inline */
                          : u.roles.map((role) => (
                            <span
                              key={role}
                              className={styles.roleBadge}
                              style={{
                                background: (ROLE_COLOR[role as keyof typeof ROLE_COLOR] ?? '#6b7280') + '22',
                                color: ROLE_COLOR[role as keyof typeof ROLE_COLOR] ?? '#6b7280',
                              }}
                            >
                              {formatRole(role as RoleName)}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={u.isActive ? 'active' : 'archived'} />
                    </td>
                    <td className={styles.date}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className={styles.actionRow}>
                        <button
                          type="button"
                          disabled={!isSuperAdmin}
                          onClick={() => openRoleEdit(u)}
                          title={isSuperAdmin ? 'Edit roles' : 'Requires super_admin'}
                          className={`${styles.actionBtn} ${styles.actionBtnEdit}`}
                        >
                          Roles
                        </button>
                        <button
                          type="button"
                          disabled={!isSuperAdmin || isMe || isToggling}
                          onClick={() => handleToggleStatus(u)}
                          title={isMe ? 'Cannot change your own status' : (u.isActive ? 'Disable' : 'Enable')}
                          className={`${styles.actionBtn} ${u.isActive ? styles.actionBtnDisable : styles.actionBtnEnable}`}
                        >
                          {isToggling ? '…' : (u.isActive ? 'Disable' : 'Enable')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          loading={isLoading}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </TableCard>

      <TableCard title="Role Permissions">
        <table className="dataTable">
          <thead>
            <tr>
              <th>Role</th>
              <th>Read</th>
              <th>Write / Create</th>
              <th>Delete</th>
              <th>User Admin</th>
            </tr>
          </thead>
          <tbody>
            {ALL_ROLES.map((role) => {
              const p = ROLE_PERMS[role];
              return (
                <tr key={role}>
                  <td>
                    {/* badge color is a dynamic runtime value from ROLE_COLOR — kept as inline */}
                    <span
                      className={styles.roleBadge}
                      style={{ background: ROLE_COLOR[role] + '22', color: ROLE_COLOR[role] }}
                    >
                      {formatRole(role)}
                    </span>
                  </td>
                  <td><span className={p.read ? styles.tick : styles.dash}>{p.read ? '✓' : '—'}</span></td>
                  <td><span className={p.write ? styles.tick : styles.dash}>{p.write ? '✓' : '—'}</span></td>
                  <td><span className={p.del ? styles.tick : styles.dash}>{p.del ? '✓' : '—'}</span></td>
                  <td><span className={p.admin ? styles.tick : styles.dash}>{p.admin ? '✓' : '—'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>

      <InviteUserModal
        open={inviteOpen}
        loading={createUser.isPending}
        error={createUser.error?.message}
        onClose={() => { setInviteOpen(false); createUser.reset(); }}
        onSubmit={handleInvite}
      />

      <EditRolesModal
        open={roleTarget !== null}
        userName={roleTarget ? getDisplayName(roleTarget) : ''}
        selectedRoles={selectedRoles}
        loading={updateRoles.isPending}
        onToggleRole={(role) =>
          setSelectedRoles((prev) =>
            prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
          )
        }
        onSave={handleSaveRoles}
        onClose={() => { setRoleTarget(null); updateRoles.reset(); }}
      />
    </PageShell>
  );
}
