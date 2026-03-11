import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import routes from '@/navigation/routes';
import type { NavigationProp, RootStackParamList } from '@/navigation/types';
import { useStore } from '@/state/store';

/**
 * Configuration for splash screen timing and behavior
 */
const SPLASH_CONFIG = {
  MIN_DISPLAY_TIME: 2000, // Minimum time to show splash screen
  MAX_TIMEOUT: 10000, // Maximum time before force navigation
} as const;

/**
 * Custom hook for managing splash screen state and navigation
 * @returns Object containing isLoading state and navigation control
 */
const useSplash = () => {
  const navigation = useNavigation<NavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const hasNavigated = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number>(Date.now());
  const bootstrap = useStore((s) => s.bootstrap);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const isBootstrapped = useStore((s) => s.isBootstrapped);

  /**
   * Determines the initial route based on app state
   * This can be extended to check authentication, onboarding status, etc.
   */
  const getInitialRoute = useCallback((): keyof RootStackParamList => {
    if (!isBootstrapped) return routes.splash;
    return isAuthenticated ? routes.home : routes.login;
  }, [isAuthenticated, isBootstrapped]);

  /**
   * Handles navigation to the appropriate screen
   */
  const navigateToApp = useCallback(() => {
    if (hasNavigated.current) return;

    hasNavigated.current = true;

    const routeName = getInitialRoute();

    // Reset navigation stack to prevent back navigation to splash
    navigation.reset({
      index: 0,
      routes: [{ name: routeName }],
    });

    setIsLoading(false);
  }, [navigation, getInitialRoute]);

  /**
   * Handles the splash screen completion with minimum display time
   */
  const completeSplash = useCallback(() => {
    const elapsedTime = Date.now() - startTime.current;
    const remainingTime = Math.max(
      0,
      SPLASH_CONFIG.MIN_DISPLAY_TIME - elapsedTime
    );

    if (remainingTime > 0) {
      // Ensure splash is shown for minimum time
      timeoutRef.current = setTimeout(navigateToApp, remainingTime);
    } else {
      // Minimum time already elapsed, navigate immediately
      navigateToApp();
    }
  }, [navigateToApp]);

  /**
   * Initialize splash screen logic
   */
  useEffect(() => {
    let isMounted = true;

    // Use requestAnimationFrame to defer initialization until next frame
    const initializeApp = () => {
      requestAnimationFrame(() => {
        if (!isMounted) return;

        bootstrap()
          .catch(() => undefined)
          .finally(() => {
            if (!isMounted) return;
            completeSplash();
          });
      });
    };

    initializeApp();

    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (isMounted && !hasNavigated.current) {
        console.warn(
          'Splash screen exceeded maximum timeout, forcing navigation'
        );
        navigateToApp();
      }
    }, SPLASH_CONFIG.MAX_TIMEOUT);

    // Cleanup function
    return () => {
      isMounted = false;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      clearTimeout(safetyTimeout);
    };
  }, [completeSplash, navigateToApp]);

  return {
    isLoading,
  };
};

export default useSplash;
