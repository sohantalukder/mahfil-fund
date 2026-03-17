import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { callApi } from '@/lib/auth/server';

type MeData = {
  user: {
    id: string;
    email: string;
    fullName?: string | null;
    roles: string[];
    communities?: Array<{ id: string; name: string; slug: string; role: string }>;
  };
};

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch full profile (roles, memberships) from the backend using the Supabase JWT.
  const me = await callApi<MeData>('/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.access_token}` }
  });

  if (me.ok) return NextResponse.json(me.data);

  // Backend unreachable or returned an error — return basic Supabase user info.
  const meta = session.user.user_metadata as Record<string, string> | undefined;
  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email ?? '',
      fullName: meta?.full_name ?? null,
      roles: []
    }
  });
}
