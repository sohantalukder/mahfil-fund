import { NextRequest, NextResponse } from 'next/server';
import { callApi, clearAuthCookies, getTokensFromCookies, setAuthCookies } from '@/lib/auth/server';

type RefreshData = { accessToken: string; refreshToken: string };
type PasswordData = { message: string; accessToken: string; refreshToken: string };

async function ensureAccessToken(): Promise<string | null> {
  const { accessToken, refreshToken } = await getTokensFromCookies();
  if (accessToken) return accessToken;
  if (!refreshToken) return null;

  const refreshed = await callApi<RefreshData>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
  if (!refreshed.ok) {
    await clearAuthCookies();
    return null;
  }

  await setAuthCookies(refreshed.data.accessToken, refreshed.data.refreshToken);
  return refreshed.data.accessToken;
}

export async function PATCH(req: NextRequest) {
  const token = await ensureAccessToken();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
  }

  const changed = await callApi<PasswordData>('/me/password', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  if (!changed.ok) return NextResponse.json({ error: changed.message }, { status: changed.status });

  await setAuthCookies(changed.data.accessToken, changed.data.refreshToken);
  return NextResponse.json({ message: changed.data.message });
}

