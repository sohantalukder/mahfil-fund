'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageShell } from '@/components/portal/shell';
import { getApi } from '@/lib/api';
import { useCurrentUser } from '@/app/providers';

type PlatformUser = {
  id: string; email: string; fullName?: string | null; isActive: boolean;
  isSuperAdmin: boolean; mustChangePassword: boolean; createdAt: string;
};

export default function PlatformUsersPage() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [temporaryPassword, setTemporaryPassword] = useState<Record<string, string>>({});
  const users = useQuery({
    queryKey: ['platform-users'],
    enabled: user?.isSuperAdmin ?? false,
    queryFn: async () => {
      const response = await getApi().get<{ users: PlatformUser[] }>('/platform/users?page=1&pageSize=100');
      if (!response.success) throw new Error(response.error.message);
      return response.data.users;
    },
  });
  const update = useMutation({
    mutationFn: async ({ path, body }: { path: string; body: unknown }) => {
      const response = await getApi().patch(path, body);
      if (!response.success) throw new Error(response.error.message);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['platform-users'] }),
  });
  const resetPassword = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const response = await getApi().post(`/platform/users/${id}/temporary-password`, { temporaryPassword: password });
      if (!response.success) throw new Error(response.error.message);
    },
    onSuccess: (_, value) => { setTemporaryPassword((current) => ({ ...current, [value.id]: '' })); void queryClient.invalidateQueries({ queryKey: ['platform-users'] }); },
  });

  return <PageShell title="Platform Accounts" subtitle="Super-admin controls for account status, platform authority, and credential resets.">
    {users.error && <div className="db-alert db-alert-danger">{users.error.message}</div>}
    <div className="db-table-card"><table className="dataTable"><thead><tr>
      <th>Account</th><th>Status</th><th>Super admin</th><th>Credential</th><th>Temporary password reset</th>
    </tr></thead><tbody>{(users.data ?? []).map((account) => <tr key={account.id}>
      <td><strong>{account.fullName || account.email}</strong><br /><small>{account.email}</small></td>
      <td><button className="db-btn db-btn-secondary" disabled={account.id === user?.id || update.isPending}
        onClick={() => update.mutate({ path: `/platform/users/${account.id}/status`, body: { isActive: !account.isActive } })}>
        {account.isActive ? 'Active' : 'Disabled'}
      </button></td>
      <td><button className="db-btn db-btn-secondary" disabled={account.id === user?.id || update.isPending}
        onClick={() => update.mutate({ path: `/platform/users/${account.id}/super-admin`, body: { isSuperAdmin: !account.isSuperAdmin } })}>
        {account.isSuperAdmin ? 'Granted' : 'Not granted'}
      </button></td>
      <td>{account.mustChangePassword ? 'Change required' : 'Current'}</td>
      <td><div style={{ display: 'flex', gap: 8 }}><input className="db-input" type="password" minLength={10}
        value={temporaryPassword[account.id] ?? ''} onChange={(event) => setTemporaryPassword((current) => ({ ...current, [account.id]: event.target.value }))}
        placeholder="10+ characters" /><button className="db-btn db-btn-primary" disabled={(temporaryPassword[account.id]?.length ?? 0) < 10 || resetPassword.isPending}
        onClick={() => resetPassword.mutate({ id: account.id, password: temporaryPassword[account.id] ?? '' })}>Reset</button></div></td>
    </tr>)}</tbody></table></div>
  </PageShell>;
}
