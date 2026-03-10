import { createApiClient } from '@mahfil/api-sdk';
import { createSupabaseBrowserClient } from './supabase/client';

export function getApi() {
  const supabase = createSupabaseBrowserClient();
  return createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL!,
    getAccessToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    }
  });
}
