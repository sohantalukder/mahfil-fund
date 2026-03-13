import { NextResponse } from 'next/server';
import { callApi, clearAuthCookies, getTokensFromCookies, setAuthCookies } from '@/lib/auth/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type RefreshData = { accessToken: string; refreshToken: string };

export async function GET() {
  // Prefer the Supabase session — its JWT is accepted by the backend directly.
  // This avoids calling the custom /auth/refresh endpoint entirely when the user
  // has a live Supabase session (the common case).
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return NextResponse.json({ accessToken: session.access_token });
    }
  } catch {
    // Fall through to custom token flow below.
  }

  // Fall back: exchange the custom refresh token stored in an httpOnly cookie.
  const { accessToken, refreshToken } = await getTokensFromCookies();
  if (accessToken) return NextResponse.json({ accessToken });
  if (!refreshToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const refreshed = await callApi<RefreshData>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
  if (!refreshed.ok) {
    await clearAuthCookies();
    return NextResponse.json({ error: refreshed.message }, { status: refreshed.status === 503 ? 503 : 401 });
  }

  await setAuthCookies(refreshed.data.accessToken, refreshed.data.refreshToken);
  return NextResponse.json({ accessToken: refreshed.data.accessToken });
}
