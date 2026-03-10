'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Props = {
  children: ReactNode;
};

export function UserGuard({ children }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;

      if (!user) {
        const next = params?.get('next') || '/user';
        const target = `/user/login?next=${encodeURIComponent(next)}`;
        router.replace(target);
        return;
      }

      setChecking(false);
    });
  }, [params, router]);

  if (checking) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}

