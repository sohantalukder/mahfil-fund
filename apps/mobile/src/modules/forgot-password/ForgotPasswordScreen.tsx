import { useState, useCallback, useRef } from 'react';
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
import { getApi } from '@/api/client';
import routes from '@/navigation/routes';
import rs from '@/shared/utilities/responsiveSize';
import {
  ShieldIcon,
  CheckCircleIcon,
  ArrowBackIcon,
} from '@/shared/components/atoms/svg-icons/AppSvgIcons';

type Step = 'email' | 'otp' | 'done';

// ── Password strength ─────────────────────────────────────────────────────────

type StrengthLevel = 'weak' | 'fair' | 'strong' | 'very_strong';

function getStrength(password: string): StrengthLevel {
  if (password.length === 0) return 'weak';
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return 'weak';
  if (score === 2) return 'fair';
  if (score === 3) return 'strong';
  return 'very_strong';
}

// ── Step indicator ────────────────────────────────────────────────────────────

type StepDotProps = {
  index: number;
  current: number;
  done: boolean;
};

function StepDot({ index, current, done }: StepDotProps) {
  const { colors } = useTheme();
  const isActive = index === current;
  const bg = done
    ? colors.success
    : isActive
    ? colors.primary
    : colors.gray3;
  return (
    <View
      style={[
        stepStyles.dot,
        {
          backgroundColor: bg,
          width: isActive ? rs(12) : rs(10),
          height: isActive ? rs(12) : rs(10),
          borderRadius: isActive ? rs(6) : rs(5),
        },
      ]}
    />
  );
}

function StepBar({ current }: { current: number }) {
  const { colors } = useTheme();
  const steps = [0, 1, 2];
  return (
    <View style={stepStyles.bar}>
      {steps.map((i) => (
        <View key={i} style={stepStyles.barItem}>
          <StepDot index={i} current={current} done={i < current} />
          {i < steps.length - 1 && (
            <View
              style={[
                stepStyles.line,
                { backgroundColor: i < current ? colors.success : colors.gray3 },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  barItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    marginHorizontal: 4,
  },
  line: {
    width: rs(40),
    height: 2,
    marginHorizontal: 2,
  },
});

// ── Password strength bar ─────────────────────────────────────────────────────

function PasswordStrengthBar({ password }: { password: string }) {
  const { colors } = useTheme();
  if (!password) return null;

  const STRENGTH_CONFIG: Record<
    StrengthLevel,
    { label: string; color: string; bars: number }
  > = {
    weak:        { label: 'Weak',        color: colors.error,   bars: 1 },
    fair:        { label: 'Fair',        color: colors.warning, bars: 2 },
    strong:      { label: 'Strong',      color: colors.success, bars: 3 },
    very_strong: { label: 'Very strong', color: colors.info,    bars: 4 },
  };

  const level = getStrength(password);
  const { label, color, bars } = STRENGTH_CONFIG[level];

  return (
    <View style={strengthStyles.container}>
      <View style={strengthStyles.barsRow}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              strengthStyles.bar,
              { backgroundColor: i < bars ? color : colors.gray3 },
            ]}
          />
        ))}
      </View>
      <Text variant="body3" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

const strengthStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 4,
  },
  barsRow: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
    marginRight: 10,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ForgotPasswordScreen() {
  const { gutters, colors, layout } = useTheme();
  const navigation = useNavigation();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stepIndex = step === 'email' ? 0 : step === 'otp' ? 1 : 2;

  const clearError = useCallback(() => setError(null), []);

  const startCooldown = useCallback(() => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────

  const onSendOtp = useCallback(async () => {
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const api = getApi();
      await api.post('/auth/forgot-password', { email: email.trim() });
      startCooldown();
      setStep('otp');
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'Something went wrong. Try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [email, startCooldown]);

  // ── Step 2: Resend OTP ────────────────────────────────────────────────────

  const onResendOtp = useCallback(async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setLoading(true);
    try {
      const api = getApi();
      await api.post('/auth/forgot-password', { email: email.trim() });
      startCooldown();
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'Something went wrong. Try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [email, resendCooldown, startCooldown]);

  // ── Step 2: Verify OTP + reset password ──────────────────────────────────

  const onResetPassword = useCallback(async () => {
    setError(null);
    if (otp.length < 6) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const api = getApi();
      await api.post('/auth/reset-password', {
        email: email.trim(),
        code: otp,
        newPassword,
      });
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      setStep('done');
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Invalid or expired code. Try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [otp, newPassword, confirmPassword, email]);

  // ── Render ────────────────────────────────────────────────────────────────

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
          {/* ── Back button ──────────────────────────────────────────────── */}
          {step !== 'done' && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (step === 'otp') {
                  setStep('email');
                  setOtp('');
                  setError(null);
                } else {
                  navigation.goBack();
                }
              }}
              style={styles.backBtn}
            >
              <ArrowBackIcon color={colors.primary} size={rs(20)} />
              <Text variant="body2" color="primary" weight="medium" style={styles.backLabel}>
                {step === 'otp' ? 'Change email' : 'Back to Sign in'}
              </Text>
            </TouchableOpacity>
          )}

          {/* ── Brand area ────────────────────────────────────────────────── */}
          <View style={styles.brandArea}>
            {step === 'done' ? (
              <View style={[styles.iconWrap, { backgroundColor: colors.success + '20' }]}>
                <CheckCircleIcon color={colors.success} size={rs(40)} />
              </View>
            ) : (
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                <ShieldIcon color={colors.primary} size={rs(36)} />
              </View>
            )}

            <Text variant="heading2" weight="bold" style={gutters.marginTop_16}>
              {step === 'email'
                ? 'Forgot Password'
                : step === 'otp'
                ? 'Check Your Email'
                : 'Password Reset!'}
            </Text>
            <Text
              variant="body2"
              color="secondary"
              style={[gutters.marginTop_4, styles.subtitle]}
            >
              {step === 'email'
                ? "Enter your email and we'll send you a reset code."
                : step === 'otp'
                ? `We sent a 6-digit code to\n${email}`
                : 'Your password has been reset successfully.'}
            </Text>
          </View>

          {/* ── Step indicator ────────────────────────────────────────────── */}
          {step !== 'done' && <StepBar current={stepIndex} />}

          {/* ── Form card ─────────────────────────────────────────────────── */}
          {step === 'email' && (
            <Card
              variant="outlined"
              borderRadius={20}
              elevation={2}
              padding={24}
              style={styles.formCard}
            >
              <TextInput
                label="Email address"
                placeholder="you@example.com"
                value={email}
                onChangeText={(v) => { setEmail(v); clearError(); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                wrapperStyle={gutters.marginBottom_20}
              />

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
                  <Text variant="body3" color="error">{error}</Text>
                </Card>
              ) : null}

              <Button
                text={loading ? 'Sending…' : 'Send Reset Code'}
                onPress={onSendOtp}
                disabled={loading}
                isLoading={loading}
                borderRadius={12}
              />
            </Card>
          )}

          {step === 'otp' && (
            <Card
              variant="outlined"
              borderRadius={20}
              elevation={2}
              padding={24}
              style={styles.formCard}
            >
              {/* OTP input */}
              <Text variant="body3" color="secondary" style={gutters.marginBottom_12}>
                Enter the 6-digit code
              </Text>
              <OTPInput
                length={6}
                callback={(code) => { setOtp(code); clearError(); }}
                style={gutters.marginBottom_24}
              />

              <Divider style={gutters.marginBottom_20} />

              {/* New password */}
              <PasswordInput
                label="New password"
                placeholder="••••••••"
                value={newPassword}
                onChangeText={(v) => { setNewPassword(v); clearError(); }}
                wrapperStyle={gutters.marginBottom_4}
              />
              <PasswordStrengthBar password={newPassword} />

              <View style={gutters.marginBottom_20} />

              {/* Confirm password */}
              <PasswordInput
                label="Confirm password"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); clearError(); }}
                wrapperStyle={gutters.marginBottom_20}
              />

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
                  <Text variant="body3" color="error">{error}</Text>
                </Card>
              ) : null}

              <Button
                text={loading ? 'Resetting…' : 'Reset Password'}
                onPress={onResetPassword}
                disabled={loading}
                isLoading={loading}
                borderRadius={12}
              />

              <Divider style={gutters.marginVertical_16} />

              {/* Resend */}
              <View style={styles.resendRow}>
                <Text variant="body3" color="secondary">Didn't get a code? </Text>
                <TouchableOpacity
                  activeOpacity={resendCooldown > 0 ? 1 : 0.7}
                  onPress={onResendOtp}
                  disabled={resendCooldown > 0 || loading}
                >
                  <Text
                    variant="body3"
                    color={resendCooldown > 0 ? 'secondary' : 'primary'}
                    weight="semibold"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}

          {step === 'done' && (
            <Card
              variant="outlined"
              borderRadius={20}
              elevation={2}
              padding={24}
              style={styles.formCard}
            >
              {/* Success checklist */}
              {[
                'Your password has been updated',
                'All previous sessions have been revoked',
                'You can now sign in with your new password',
              ].map((item) => (
                <View key={item} style={styles.checkItem}>
                  <CheckCircleIcon color={colors.success} size={rs(18)} />
                  <Text variant="body3" color="secondary" style={styles.checkText}>
                    {item}
                  </Text>
                </View>
              ))}

              <View style={gutters.marginBottom_24} />

              <Button
                text="Go to Sign in"
                onPress={() =>
                  navigation.reset
                    ? (navigation as any).reset({
                        index: 0,
                        routes: [{ name: routes.login }],
                      })
                    : navigation.goBack()
                }
                borderRadius={12}
              />
            </Card>
          )}

          {/* ── Footer ──────────────────────────────────────────────────────── */}
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  backLabel: {
    marginLeft: 6,
  },
  brandArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconWrap: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  formCard: {
    marginBottom: 24,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkText: {
    marginLeft: 10,
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  footerText: {
    textAlign: 'center',
  },
});
