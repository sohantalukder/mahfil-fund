import { NextRequest, NextResponse } from 'next/server';
import { callApi, clearAuthCookies, getTokensFromCookies, setAuthCookies } from '@/lib/auth/server';

type RefreshData = { accessToken: string; refreshToken: string };
type CreateUserData = { user: unknown };

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

export async function POST(req: NextRequest) {
  try {
    const token = await ensureAccessToken();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { email, password, fullName, roles } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const created = await callApi<CreateUserData>('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        email,
        password,
        fullName: fullName || undefined,
        roles: Array.isArray(roles) ? roles : undefined
      })
    });
    if (!created.ok) return NextResponse.json({ error: created.message }, { status: created.status });
    return NextResponse.json(created.data, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal error' }, { status: 500 });
  }
}
