import { NextResponse } from 'next/server';
import { callApi, clearAuthCookies, getTokensFromCookies } from '@/lib/auth/server';

export async function POST() {
  const { refreshToken, accessToken } = await getTokensFromCookies();

  if (refreshToken) {
    await callApi('/auth/logout', {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      body: JSON.stringify({ refreshToken })
    }).catch(() => undefined);
  }

  await clearAuthCookies();
  return NextResponse.json({ success: true });
}

