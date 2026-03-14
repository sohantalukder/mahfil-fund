import { NextRequest, NextResponse } from 'next/server';
import { callApi, clearAuthCookies, getTokensFromCookies, setAuthCookies } from '@/lib/auth/server';

type RefreshData = { accessToken: string; refreshToken: string };
type ProfileData = { user: { id: string; email: string; fullName?: string | null; createdAt?: string } };

async function ensureAccessToken(): Promise<string | null> {
  const { accessToken, refreshToken } = await getTokensFromCookies();
  if (accessToken) return accessToken;
  if (!refreshToken) return null;

  const refreshed = await callApi<RefreshData>('/auth/refresh', {
    method: 'POST',
    data: { refreshToken },
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

  const { fullName } = await req.json();
  if (!fullName) return NextResponse.json({ error: 'Full name is required' }, { status: 400 });

  const updated = await callApi<ProfileData>('/me/profile', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    data: { fullName },
  });
  if (!updated.ok) return NextResponse.json({ error: updated.message }, { status: updated.status });

  return NextResponse.json(updated.data);
}

