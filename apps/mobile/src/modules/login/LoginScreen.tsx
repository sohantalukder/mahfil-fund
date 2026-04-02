import { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { navigationRef } from '@/navigation/navigationRef';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import { Button, Card, Divider, Image } from '@/shared/components/atoms';
import TextInput from '@/shared/components/atoms/text-input/TextInput';
import { PasswordInput } from '@/shared/components/molecules';
import { useTheme } from '@/theme';
import { supabase } from '@/lib/supabase';
import { isEnvConfigured } from '@/config/env';
import { useAuth } from '@/contexts/AuthContext';
import routes from '@/navigation/routes';
import rs from '@/shared/utilities/responsiveSize';

export default function LoginScreen() {
  const { session } = useAuth();
  const { gutters, colors, layout, logo } = useTheme();
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      navigationRef.reset({ index: 0, routes: [{ name: routes.main, key: routes.main }] });
    }
  }, [session]);

  const onSubmit = useCallback(async () => {
    setError(null);
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    if (!isEnvConfigured()) { setError('App is not configured. Contact support.'); return; }

    setLoading(true);
    try {
      const { error: e } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (e) setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        style={layout.flex_1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand area ─────────────────────────────────────────────── */}
          <View style={styles.brandArea}>
            {logo != null ? (
              <View style={styles.logoWrap}>
                <Image
                  source={logo}
                  height={rs(72)}
                  width={rs(72)}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={[styles.logoWrap, styles.logoFallback, { backgroundColor: colors.primary }]}>
                <Text style={styles.logoEmoji}>🕌</Text>
              </View>
            )}
            <Text variant="heading2" weight="bold" style={gutters.marginTop_16}>
              Mahfil Fund
            </Text>
            <Text variant="body2" color="secondary" style={gutters.marginTop_4}>
              Sign in to your account
            </Text>
          </View>

          {/* ── Env warning ────────────────────────────────────────────── */}
          {!isEnvConfigured() && (
            <Card
              variant="outlined"
              borderColor={colors.warning}
              backgroundColor={colors.warning + '18'}
              padding={14}
              borderRadius={12}
              shadow={false}
              style={gutters.marginBottom_16}
            >
              <Text variant="body3" style={{ color: colors.warning }}>
                ⚠️  Add .env in apps/mobile (see .env.example)
              </Text>
            </Card>
          )}

          {/* ── Form card ──────────────────────────────────────────────── */}
          <View>
            {/* Email */}
            <TextInput
              label="Email address"
              placeholder="you@example.com"
              value={email}
              onChangeText={(v) => { setEmail(v); clearError(); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              wrapperStyle={gutters.marginBottom_16}
            />

            {/* Password */}
            <PasswordInput
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={(v) => { setPassword(v); clearError(); }}
              wrapperStyle={gutters.marginBottom_8}
            />

            {/* Forgot password link */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate(routes.forgotPassword as never)}
              style={[gutters.marginBottom_20, layout.itemsEnd]}
            >
              <Text variant="body3" color="primary" weight="medium">
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* Error */}
            {error ? (
              <Card
                variant="outlined"
                borderColor={colors.error}
                backgroundColor={colors.error + '12'}
                padding={12}
                borderRadius={10}
                shadow={false}
                style={gutters.marginBottom_16}
              >
                <Text variant="body3" color="error">
                  {error}
                </Text>
              </Card>
            ) : null}

            {/* Primary action button */}
            <Button
              text={loading ? 'Signing in…' : 'Sign in'}
              onPress={onSubmit}
              disabled={loading}
              isLoading={loading}
              borderRadius={12}
            />

            <Divider style={gutters.marginVertical_20} />
            <View style={styles.signupRow}>
              <Text variant="body3" color="secondary">Don't have an account? </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate(routes.signup as never)}
              >
                <Text variant="body3" color="primary" weight="semibold">Create one</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <View style={styles.footer}>
            <Text variant="body3" color="secondary" style={styles.footerText}>
              Iftar Mahfil Fund Manager · Powered by Mahfil
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  brandArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  footerText: {
    textAlign: 'center',
  },
  formCard: {
    marginBottom: 24,
  },
  logoEmoji: {
    fontSize: rs(40),
  },
  logoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    borderRadius: rs(22),
    height: rs(88),
    justifyContent: 'center',
    overflow: 'hidden',
    width: rs(88),
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  signupRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
