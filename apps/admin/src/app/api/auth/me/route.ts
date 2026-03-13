import { NextResponse } from 'next/server';
import { callApi, clearAuthCookies, getTokensFromCookies, setAuthCookies } from '@/lib/auth/server';

type MeData = { user: { id: string; email: string; fullName?: string | null; roles: string[] } };
type RefreshData = { accessToken: string; refreshToken: string };

export async function GET() {
  const { accessToken, refreshToken } = await getTokensFromCookies();
  if (!accessToken && !refreshToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  async function tryMe(token: string) {
    return callApi<MeData>('/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  if (accessToken) {
    const me = await tryMe(accessToken);
    if (me.ok) return NextResponse.json(me.data);
  }

  if (!refreshToken) {
    await clearAuthCookies();
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const refreshed = await callApi<RefreshData>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
  if (!refreshed.ok) {
    await clearAuthCookies();
    return NextResponse.json({ error: refreshed.message }, { status: 401 });
  }

  await setAuthCookies(refreshed.data.accessToken, refreshed.data.refreshToken);
  const me = await tryMe(refreshed.data.accessToken);
  if (!me.ok) {
    await clearAuthCookies();
    return NextResponse.json({ error: me.message }, { status: 401 });
  }

  return NextResponse.json(me.data);
}

