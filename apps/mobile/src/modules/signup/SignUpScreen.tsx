/* eslint-disable react-native/sort-styles */
/* eslint-disable react-native/no-inline-styles */
import { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import { Button, Card, Divider, OTPInput } from '@/shared/components/atoms';
import TextInput from '@/shared/components/atoms/text-input/TextInput';
import { PasswordInput } from '@/shared/components/molecules';
import { useTheme } from '@/theme';
import { supabase } from '@/lib/supabase';
import { isEnvConfigured } from '@/config/env';
import routes from '@/navigation/routes';
import rs from '@/shared/utilities/responsiveSize';
import withOpacity from '@/shared/utilities/withOpacity';
import { ArrowBackIcon, CheckCircleIcon } from '@/shared/components/atoms/svg-icons/AppSvgIcons';

// ─── Step indicator ────────────────────────────────────────────────────────────
type Step = 'register' | 'verify' | 'done';

function StepDot({ active, done, colors }: { active: boolean; done: boolean; colors: ReturnType<typeof useTheme>['colors'] }) {
  const bg = done ? colors.success : active ? colors.primary : colors.gray7;
  return (
    <View style={[stepStyles.dot, { backgroundColor: bg }]}>
      {done && <CheckCircleIcon color={colors.white} size={10} />}
    </View>
  );
}

function StepBar({ step, colors }: { step: Step; colors: ReturnType<typeof useTheme>['colors'] }) {
  const isVerify = step === 'verify' || step === 'done';
  const isDone = step === 'done';
  return (
    <View style={stepStyles.bar}>
      <StepDot active={step === 'register'} done={isVerify} colors={colors} />
      <View style={[stepStyles.line, { backgroundColor: isVerify ? colors.primary : colors.gray7 }]} />
      <StepDot active={step === 'verify'} done={isDone} colors={colors} />
      <View style={[stepStyles.line, { backgroundColor: isDone ? colors.success : colors.gray7 }]} />
      <StepDot active={step === 'done'} done={false} colors={colors} />
    </View>
  );
}

const stepStyles = StyleSheet.create({
  bar: { alignItems: 'center', flexDirection: 'row', marginBottom: 28 },
  dot: {
    alignItems: 'center',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  line: { flex: 1, height: 2, marginHorizontal: 6 },
});

// ─── Password strength ────────────────────────────────────────────────────────
type StrengthLevel = 'weak' | 'fair' | 'strong' | 'very_strong';

function getStrength(pw: string): StrengthLevel {
  if (pw.length < 6) return 'weak';
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return 'fair';
  if (score === 2) return 'strong';
  return 'very_strong';
}

function PasswordStrength({ password, colors }: { password: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  if (!password) return null;
  const level = getStrength(password);

  const STRENGTH_CONFIG: Record<StrengthLevel, { label: string; color: string; bars: number }> = {
    weak:        { label: 'Weak',        color: colors.error,   bars: 1 },
    fair:        { label: 'Fair',        color: colors.warning, bars: 2 },
    strong:      { label: 'Strong',      color: colors.success, bars: 3 },
    very_strong: { label: 'Very strong', color: colors.info,    bars: 4 },
  };

  const config = STRENGTH_CONFIG[level];
  return (
    <View style={strengthStyles.wrap}>
      <View style={strengthStyles.barsRow}>
        {[1, 2, 3, 4].map((n) => (
          <View
            key={n}
            style={[
              strengthStyles.bar,
              { backgroundColor: n <= config.bars ? config.color : colors.gray7 },
            ]}
          />
        ))}
      </View>
      <Text variant="body3" style={{ color: config.color, marginTop: 4 }}>
        {config.label} password
      </Text>
    </View>
  );
}

const strengthStyles = StyleSheet.create({
  bar: { borderRadius: 2, flex: 1, height: 4 },
  barsRow: { flexDirection: 'row', gap: 4 },
  wrap: { marginBottom: 12 },
});

// ─── Main component ───────────────────────────────────────────────────────────
export default function SignUpScreen() {
  const { gutters, colors, layout } = useTheme();
  const navigation = useNavigation();
  const styles = useMemo(() => getStyles(colors), [colors]);

  // ── Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── UI state
  const [step, setStep] = useState<Step>('register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');

  const clearError = useCallback(() => setError(null), []);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = useCallback((): string | null => {
    if (!fullName.trim()) return 'Please enter your full name.';
    if (!email.trim()) return 'Please enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    if (!isEnvConfigured()) return 'App is not configured. Contact support.';
    return null;
  }, [fullName, email, password, confirmPassword]);

  // ── Step 1: Register ──────────────────────────────────────────────────────
  const onRegister = useCallback(async () => {
    clearError();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const { error: e } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: 'mahfil://auth-callback',
        },
      });
      if (e) { setError(e.message); return; }
      setStep('verify');
    } finally {
      setLoading(false);
    }
  }, [email, password, fullName, validate, clearError]);

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const onVerifyOtp = useCallback(async () => {
    clearError();
    if (otpCode.length < 6) { setError('Enter the 6-digit code from your email.'); return; }

    setLoading(true);
    try {
      const { error: e } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode,
        type: 'signup',
      });
      if (e) { setError(e.message); return; }
      setStep('done');
    } finally {
      setLoading(false);
    }
  }, [email, otpCode, clearError]);

  const onResendCode = useCallback(async () => {
    clearError();
    setLoading(true);
    try {
      const { error: e } = await supabase.auth.resend({
        email: email.trim(),
        type: 'signup',
      });
      if (e) setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [email, clearError]);

  // ── Navigate to login ─────────────────────────────────────────────────────
  const goToLogin = useCallback(() => {
    navigation.navigate(routes.login as never);
  }, [navigation]);

  // ─── Render ───────────────────────────────────────────────────────────────
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
          {/* ── Back button (not on done step) ─────────────────────────── */}
          {step !== 'done' && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={step === 'register' ? goToLogin : () => setStep('register')}
              activeOpacity={0.7}
            >
              <ArrowBackIcon color={colors.text} size={20} />
            </TouchableOpacity>
          )}

          {/* ── Brand ──────────────────────────────────────────────────── */}
          <View style={styles.brand}>
            <View style={[styles.logoRing, { borderColor: withOpacity(colors.primary, 0.2) }]}>
              <View style={[styles.logoInner, { backgroundColor: colors.primary }]}>
                <Text style={styles.logoEmoji}>🕌</Text>
              </View>
            </View>
            <Text variant="heading2" weight="bold" style={gutters.marginTop_12}>
              {step === 'done' ? "You're all set!" : 'Create account'}
            </Text>
            <Text variant="body2" color="secondary" style={gutters.marginTop_4}>
              {step === 'register' && 'Join Mahfil Fund to manage donations'}
              {step === 'verify' && `Enter the code sent to ${email}`}
              {step === 'done' && 'Your account is ready. Welcome aboard!'}
            </Text>
          </View>

          {/* ── Step bar ───────────────────────────────────────────────── */}
          <StepBar step={step} colors={colors} />

          {/* ── STEP 1 — Register form ─────────────────────────────────── */}
          {step === 'register' && (
            <Card variant="outlined" borderRadius={20} elevation={1} padding={24} shadow={false} style={styles.card}>
              <TextInput
                label="Full name"
                placeholder="Ahmed Al-Rashid"
                value={fullName}
                onChangeText={(v) => { setFullName(v); clearError(); }}
                autoCapitalize="words"
                autoCorrect={false}
                wrapperStyle={gutters.marginBottom_16}
              />

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

              <PasswordInput
                label="Password"
                placeholder="Min. 8 characters"
                value={password}
                onChangeText={(v) => { setPassword(v); clearError(); }}
                wrapperStyle={gutters.marginBottom_8}
              />

              <PasswordStrength password={password} colors={colors} />

              <PasswordInput
                label="Confirm password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); clearError(); }}
                wrapperStyle={gutters.marginBottom_20}
              />

              {/* Password rules hint */}
              <Card
                variant="filled"
                borderRadius={10}
                padding={12}
                shadow={false}
                style={gutters.marginBottom_20}
              >
                <Text variant="body3" color="secondary">
                  Password must be at least 8 characters with uppercase, numbers, and symbols for best security.
                </Text>
              </Card>

              {/* Error */}
              {error && (
                <Card
                  variant="outlined"
                  borderColor={colors.error}
                  backgroundColor={withOpacity(colors.error, 0.08)}
                  padding={12}
                  borderRadius={10}
                  shadow={false}
                  style={gutters.marginBottom_16}
                >
                  <Text variant="body3" color="error">{error}</Text>
                </Card>
              )}

              <Button
                text={loading ? 'Creating account…' : 'Create account'}
                onPress={onRegister}
                disabled={loading}
                isLoading={loading}
                borderRadius={12}
              />

              <Divider style={gutters.marginVertical_20} />

              {/* Login link */}
              <View style={styles.loginRow}>
                <Text variant="body3" color="secondary">Already have an account? </Text>
                <TouchableOpacity activeOpacity={0.7} onPress={goToLogin}>
                  <Text variant="body3" color="primary" weight="semibold">Sign in</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}

          {/* ── STEP 2 — Verify email ──────────────────────────────────── */}
          {step === 'verify' && (
            <Card variant="outlined" borderRadius={20} elevation={1} padding={24} shadow={false} style={styles.card}>
              {/* Email icon */}
              <View style={[styles.verifyIconWrap, { backgroundColor: withOpacity(colors.primary, 0.1) }]}>
                <Text style={styles.verifyEmoji}>📧</Text>
              </View>
              <Text variant="body2" color="secondary" style={[gutters.marginBottom_24, { textAlign: 'center' }]}>
                We sent a 6-digit verification code to{'\n'}
                <Text variant="body2" weight="semibold">{email}</Text>
              </Text>

              {/* OTP input */}
              <OTPInput
                length={6}
                callback={(code) => { setOtpCode(code); clearError(); }}
                style={gutters.marginBottom_24}
              />

              {/* Error */}
              {error && (
                <Card
                  variant="outlined"
                  borderColor={colors.error}
                  backgroundColor={withOpacity(colors.error, 0.08)}
                  padding={12}
                  borderRadius={10}
                  shadow={false}
                  style={gutters.marginBottom_16}
                >
                  <Text variant="body3" color="error">{error}</Text>
                </Card>
              )}

              <Button
                text={loading ? 'Verifying…' : 'Verify email'}
                onPress={onVerifyOtp}
                disabled={loading}
                isLoading={loading}
                borderRadius={12}
              />

              <Divider style={gutters.marginVertical_20} />

              <View style={styles.resendRow}>
                <Text variant="body3" color="secondary">Didn't receive the code? </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onResendCode}
                  disabled={loading}
                >
                  <Text variant="body3" color="primary" weight="semibold">Resend</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.changeEmailBtn}
                activeOpacity={0.7}
                onPress={() => { setStep('register'); clearError(); setOtpCode(''); }}
              >
                <Text variant="body3" color="secondary">
                  Wrong email? <Text variant="body3" color="primary" weight="medium">Change it</Text>
                </Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* ── STEP 3 — Done ─────────────────────────────────────────── */}
          {step === 'done' && (
            <Card variant="outlined" borderRadius={20} elevation={1} padding={24} shadow={false} style={styles.card}>
              {/* Success animation placeholder */}
              <View style={[styles.successCircle, { backgroundColor: withOpacity(colors.success, 0.12) }]}>
                <View style={[styles.successInner, { backgroundColor: withOpacity(colors.success, 0.2) }]}>
                  <CheckCircleIcon color={colors.success} size={42} />
                </View>
              </View>

              <Text
                variant="body2"
                color="secondary"
                style={[gutters.marginBottom_8, { textAlign: 'center' }]}
              >
                Account created for
              </Text>
              <Text
                variant="body1"
                weight="semibold"
                style={[gutters.marginBottom_24, { textAlign: 'center' }]}
              >
                {email}
              </Text>

              {/* Checklist */}
              {[
                'Account securely created',
                'Email verified',
                'Ready to track donations & expenses',
              ].map((item) => (
                <View key={item} style={styles.checkItem}>
                  <View style={[styles.checkDot, { backgroundColor: withOpacity(colors.success, 0.15) }]}>
                    <CheckCircleIcon color={colors.success} size={14} />
                  </View>
                  <Text variant="body3" style={gutters.marginLeft_12}>{item}</Text>
                </View>
              ))}

              <View style={gutters.marginTop_24}>
                <Button
                  text="Go to Sign in"
                  onPress={goToLogin}
                  borderRadius={12}
                />
              </View>
            </Card>
          )}

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <View style={styles.footer}>
            <Text variant="body3" color="secondary" style={{ textAlign: 'center' }}>
              By creating an account you agree to our{' '}
              <Text variant="body3" color="primary">Terms of Service</Text>
              {' '}and{' '}
              <Text variant="body3" color="primary">Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 32,
      paddingHorizontal: 24,
      paddingTop: 16,
    },
    backBtn: {
      alignItems: 'center',
      backgroundColor: colors.gray9,
      borderRadius: 20,
      height: 40,
      justifyContent: 'center',
      marginBottom: 24,
      width: 40,
    },
    brand: {
      alignItems: 'center',
      marginBottom: 32,
    },
    logoRing: {
      alignItems: 'center',
      borderRadius: rs(28),
      borderWidth: 2,
      height: rs(96),
      justifyContent: 'center',
      width: rs(96),
    },
    logoInner: {
      alignItems: 'center',
      borderRadius: rs(20),
      height: rs(76),
      justifyContent: 'center',
      width: rs(76),
    },
    logoEmoji: { fontSize: rs(36) },
    card: { marginBottom: 24 },
    loginRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    // Verify step
    verifyIconWrap: {
      alignItems: 'center',
      alignSelf: 'center',
      borderRadius: rs(40),
      height: rs(80),
      justifyContent: 'center',
      marginBottom: 16,
      width: rs(80),
    },
    verifyEmoji: { fontSize: rs(36) },
    resendRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    changeEmailBtn: {
      alignItems: 'center',
      marginTop: 12,
    },
    // Done step
    successCircle: {
      alignItems: 'center',
      alignSelf: 'center',
      borderRadius: rs(55),
      height: rs(110),
      justifyContent: 'center',
      marginBottom: 20,
      width: rs(110),
    },
    successInner: {
      alignItems: 'center',
      borderRadius: rs(40),
      height: rs(80),
      justifyContent: 'center',
      width: rs(80),
    },
    checkItem: {
      alignItems: 'center',
      flexDirection: 'row',
      marginBottom: 12,
    },
    checkDot: {
      alignItems: 'center',
      borderRadius: 14,
      height: 28,
      justifyContent: 'center',
      width: 28,
    },
    footer: {
      paddingBottom: 8,
      paddingHorizontal: 8,
    },
  });
