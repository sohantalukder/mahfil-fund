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
import { Button, Card, Image } from '@/shared/components/atoms';
import TextInput from '@/shared/components/atoms/text-input/TextInput';
import { PasswordInput } from '@/shared/components/molecules';
import { useTheme } from '@/theme';
import { isEnvConfigured } from '@/config/env';
import { useAuth } from '@/contexts/AuthContext';
import routes from '@/navigation/routes';
import rs from '@/shared/utilities/responsiveSize';

export default function LoginScreen() {
  const { session, signIn, completeFirstLogin } = useAuth();
  const { gutters, colors, layout, logo } = useTheme();
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (session) {
      navigationRef.reset({ index: 0, routes: [{ name: routes.main, key: routes.main }] });
    }
  }, [session]);

  const onSubmit = useCallback(async () => {
    setError(null);
    if (challengeToken) {
      if (newPassword.length < 10) { setError('Password must contain at least 10 characters.'); return; }
      if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    } else {
      if (!email.trim()) { setError('Please enter your email address.'); return; }
      if (!password) { setError('Please enter your password.'); return; }
    }
    if (!isEnvConfigured()) { setError('App is not configured. Contact support.'); return; }

    setLoading(true);
    try {
      if (challengeToken) {
        await completeFirstLogin(challengeToken, newPassword);
      } else {
        const result = await signIn(email.trim(), password);
        if (result.requiresPasswordChange) {
          setChallengeToken(result.challengeToken);
          setPassword('');
        }
      }
    } catch (caught) {
      const message = (caught as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(message ?? (caught instanceof Error ? caught.message : 'Unable to sign in.'));
    } finally {
      setLoading(false);
    }
  }, [challengeToken, completeFirstLogin, confirmPassword, email, newPassword, password, signIn]);

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
                ⚠️ Add .env in mobile (see .env.example)
              </Text>
            </Card>
          )}

          {/* ── Form card ──────────────────────────────────────────────── */}
          <View>
            {!challengeToken ? <>{/* Email */}
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
            </> : <>
              <Text variant="body2" color="secondary" style={gutters.marginBottom_16}>
                Replace your administrator-issued temporary password before continuing.
              </Text>
              <PasswordInput label="New password" placeholder="At least 10 characters" value={newPassword}
                onChangeText={(value) => { setNewPassword(value); clearError(); }} wrapperStyle={gutters.marginBottom_16} />
              <PasswordInput label="Confirm password" placeholder="Repeat new password" value={confirmPassword}
                onChangeText={(value) => { setConfirmPassword(value); clearError(); }} wrapperStyle={gutters.marginBottom_16} />
            </>}

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
              text={loading ? 'Please wait…' : challengeToken ? 'Set password and continue' : 'Sign in'}
              onPress={onSubmit}
              disabled={loading}
              isLoading={loading}
              borderRadius={12}
            />
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
});
