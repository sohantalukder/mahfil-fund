import { NextRequest, NextResponse } from 'next/server';
import { callApi, setAuthCookies } from '@/lib/auth/server';

type LoginData = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; fullName?: string | null; roles: string[] };
};

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const result = await callApi<LoginData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });

    await setAuthCookies(result.data.accessToken, result.data.refreshToken);
    return NextResponse.json({ user: result.data.user });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal error' }, { status: 500 });
  }
}

