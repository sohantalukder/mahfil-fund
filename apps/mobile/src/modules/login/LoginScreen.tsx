import { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { navigationRef } from '@/navigation/navigationRef';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import Button from '@/shared/components/atoms/buttons/Button';
import TextInput from '@/shared/components/atoms/text-input/TextInput';
import { Image } from '@/shared/components/atoms';
import { useTheme } from '@/theme';
import { supabase } from '@/lib/supabase';
import { isEnvConfigured } from '@/config/env';
import { useAuth } from '@/contexts/AuthContext';
import routes from '@/navigation/routes';
import EyeOnIcon from '@/assets/icons/EyeOn.icon';
import EyeOffIcon from '@/assets/icons/EyeOff.icon';
import rs from '@/shared/utilities/responsiveSize';

export default function LoginScreen() {
  const { session } = useAuth();
  const { gutters, colors, layout, logo } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (session) {
      navigationRef.reset({ index: 0, routes: [{ name: routes.main, key: routes.main }] });
    }
  }, [session]);

  async function onSubmit() {
    setError(null);
    if (!email.trim()) {
      setError('Enter your email');
      return;
    }
    if (!password) {
      setError('Enter your password');
      return;
    }
    if (!isEnvConfigured()) {
      setError('Configure API_URL, SUPABASE_URL, SUPABASE_ANON_KEY in .env');
      return;
    }
    setLoading(true);
    try {
      const { error: e } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (e) {
        setError(e.message);
        return;
      }
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword() {
    setError(null);
    setForgotSent(false);
    if (!email.trim()) {
      setError('Enter your email above, then tap Forgot password.');
      return;
    }
    if (!isEnvConfigured()) {
      setError('Configure API_URL, SUPABASE_URL, SUPABASE_ANON_KEY in .env');
      return;
    }
    setLoading(true);
    try {
      const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'mahfil://login-callback',
      });
      if (e) {
        setError(e.message);
        return;
      }
      setForgotSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeScreen>
      <ScrollView
        contentContainerStyle={[
          gutters.paddingHorizontal_24,
          gutters.paddingTop_32,
          gutters.paddingBottom_32,
          layout.flexGrow_1,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {logo != null ? (
          <View style={[layout.itemsCenter, gutters.marginBottom_24]}>
            <Image
              source={logo}
              height={rs(140)}
              width={rs(140)}
              borderRadius={50}
            />
          </View>
        ) : null}
        <Text variant="heading1" style={gutters.marginBottom_8}>
          Mahfil Fund
        </Text>
        <Text color="secondary" style={gutters.marginBottom_32}>
          Sign in with your email and password.
        </Text>
        {!isEnvConfigured() ? (
          <View
            style={[
              gutters.padding_16,
              { backgroundColor: colors.warning + '22', borderRadius: rs(8) },
            ]}
          >
            <Text color="warning">Add .env in apps/mobile (see .env.example)</Text>
          </View>
        ) : null}
        <TextInput
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={(v) => setEmail(v)}
          keyboardType="email-address"
          autoCapitalize="none"
          wrapperStyle={gutters.marginBottom_16}
        />
        <TextInput
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={(v) => setPassword(v)}
          secureTextEntry={!showPassword}
          rightIcon={
            showPassword ? (
              <EyeOnIcon width={22} height={22} />
            ) : (
              <EyeOffIcon width={22} height={22} />
            )
          }
          rightHandler={() => setShowPassword((p) => !p)}
          wrapperStyle={gutters.marginBottom_8}
        />
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>  onForgotPassword()}
          disabled={loading}
          style={gutters.marginBottom_16}
        >
            <Text color="primary" style={{ fontSize: rs(14) }}>
            Forgot password?
          </Text>
        </TouchableOpacity>
        {error ? (
          <Text color="error" style={gutters.marginBottom_12}>
            {error}
          </Text>
        ) : null}
        {forgotSent ? (
          <Text color="success" style={gutters.marginBottom_16}>
            Check your email for the password reset link.
          </Text>
        ) : null}
        <Button
          text={loading ? 'Signing in…' : 'Sign in'}
          onPress={ onSubmit}
          disabled={loading}
          isLoading={loading}
        />
      </ScrollView>
    </SafeScreen>
  );
}
