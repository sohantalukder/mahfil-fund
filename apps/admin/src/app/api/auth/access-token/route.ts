import { NextResponse } from 'next/server';
import { callApi, clearAuthCookies, getTokensFromCookies, setAuthCookies } from '@/lib/auth/server';

type RefreshData = { accessToken: string; refreshToken: string };

export async function GET() {
  const { accessToken, refreshToken } = await getTokensFromCookies();
  if (accessToken) return NextResponse.json({ accessToken });
  if (!refreshToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const refreshed = await callApi<RefreshData>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
  if (!refreshed.ok) {
    await clearAuthCookies();
    return NextResponse.json({ error: refreshed.message }, { status: 401 });
  }

  await setAuthCookies(refreshed.data.accessToken, refreshed.data.refreshToken);
  return NextResponse.json({ accessToken: refreshed.data.accessToken });
}

