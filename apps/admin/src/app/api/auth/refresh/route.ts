import { NextResponse } from 'next/server';
import { callApi, clearAuthCookies, getTokensFromCookies, setAuthCookies } from '@/lib/auth/server';

type RefreshData = { accessToken: string; refreshToken: string };

export async function POST() {
  const { refreshToken } = await getTokensFromCookies();
  if (!refreshToken) return NextResponse.json({ error: 'No refresh token' }, { status: 401 });

  const result = await callApi<RefreshData>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
  if (!result.ok) {
    await clearAuthCookies();
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  await setAuthCookies(result.data.accessToken, result.data.refreshToken);
  return NextResponse.json({ accessToken: result.data.accessToken });
}

