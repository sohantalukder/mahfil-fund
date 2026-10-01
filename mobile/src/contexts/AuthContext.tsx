import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  completeFirstLogin as completeFirstLoginRequest,
  logout,
  reloadSessionProfile,
  restoreSession,
  signIn as signInRequest,
  subscribeSession,
  type AppSession,
  type SignInResult,
} from '@/services/auth/session.service';

type AuthContextValue = {
  session: AppSession | null;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  completeFirstLogin: (challengeToken: string, newPassword: string) => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSession(await reloadSessionProfile());
      setAuthError(null);
    } catch (error) {
      setSession(null);
      setAuthError(error instanceof Error ? error.message : 'Unable to restore session');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeSession(setSession);
    setLoading(true);
    void restoreSession()
      .catch((error: unknown) => {
        setAuthError(error instanceof Error ? error.message : 'Unable to restore session');
      })
      .finally(() => setLoading(false));
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await signInRequest(email, password);
    setSession(response.session);
    setAuthError(null);
    return response.result;
  }, []);

  const completeFirstLogin = useCallback(async (challengeToken: string, newPassword: string) => {
    setSession(await completeFirstLoginRequest(challengeToken, newPassword));
    setAuthError(null);
  }, []);

  const signOut = useCallback(async () => {
    try { await logout(); } finally { setSession(null); }
  }, []);

  return <AuthContext.Provider value={{ session, loading, authError, signIn, completeFirstLogin, refresh, signOut }}>
    {children}
  </AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
