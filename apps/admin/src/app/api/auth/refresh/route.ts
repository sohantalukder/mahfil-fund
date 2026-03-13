import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.refreshSession();

  if (error || !data.session) {
    return NextResponse.json({ error: error?.message ?? 'Session refresh failed' }, { status: 401 });
  }

  return NextResponse.json({ accessToken: data.session.access_token });
}
