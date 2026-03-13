import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { clearAuthCookies } from '@/lib/auth/server';

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  await clearAuthCookies();
  return NextResponse.json({ success: true });
}
