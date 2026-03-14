import { useState, useCallback } from 'react';
import { useStore } from '@/state/store';

export function useAuthLogin() {
  const login = useStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (): Promise<boolean> => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [login, email, password]);

  return {
    email,
    setEmail,
    password,
    setPassword,
    error,
    submitting,
    submit,
  };
}
