import { useState, useEffect, useCallback, useRef } from 'react';
import routes from '@/navigation/routes';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/contexts/AuthContext';
import { navigationRef } from '@/navigation/navigationRef';

const SPLASH_CONFIG = { MIN_DISPLAY_TIME: 2000, MAX_TIMEOUT: 10000 } as const;

const useSplash = () => {
  const { session, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const hasNavigated = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTime = useRef<number>(Date.now());

  const navigateToApp = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    const target: keyof RootStackParamList = session ? routes.main : routes.login;
    navigationRef.reset({
      index: 0,
      routes: [{ name: target, key: target }],
    });
    setIsLoading(false);
  }, [session]);

  const completeSplash = useCallback(() => {
    const elapsed = Date.now() - startTime.current;
    const remaining = Math.max(0, SPLASH_CONFIG.MIN_DISPLAY_TIME - elapsed);
    if (remaining > 0) {
      timeoutRef.current = setTimeout(navigateToApp, remaining);
    } else {
      navigateToApp();
    }
  }, [navigateToApp]);

  useEffect(() => {
    if (authLoading) return;
    let mounted = true;
    requestAnimationFrame(() => {
      if (mounted) completeSplash();
    });
    const safety = setTimeout(() => {
      if (mounted && !hasNavigated.current) navigateToApp();
    }, SPLASH_CONFIG.MAX_TIMEOUT);
    return () => {
      mounted = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearTimeout(safety);
    };
  }, [authLoading, completeSplash, navigateToApp]);

  return { isLoading };
};

export default useSplash;
