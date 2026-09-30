import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import TextInput from '@/shared/components/atoms/text-input/TextInput';
import Button from '@/shared/components/atoms/buttons/Button';
import { useTheme } from '@/theme';
import { getApi } from '@/api/client';
import { useMe } from '@/hooks/useMe';
import { useNavigation } from '@react-navigation/native';

export default function JoinScreen() {
  const { gutters } = useTheme();
  const { invalidateMe } = useMe(true);
  const navigation = useNavigation();
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function formatCode(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }

  async function submit() {
    setError('');
    const normalized = code.replace(/\s/g, '');
    if (normalized.length !== 16) {
      setError('Enter a valid 16-digit invite code.');
      return;
    }
    setLoading(true);
    try {
      const api = getApi();
      const res = await api.post('/invitations/verify', {
        inviteCode: normalized,
        fullName: fullName.trim() || undefined,
        phoneNumber: phone.trim() || undefined,
      });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setSuccess(true);
      await invalidateMe();
      setTimeout(() => navigation.goBack(), 1500);
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={[gutters.paddingHorizontal_20, gutters.paddingVertical_20]}>
        <Text variant="heading3" style={gutters.marginBottom_16}>
          Join community
        </Text>
        {success ? (
          <Text color="success">Joined successfully.</Text>
        ) : (
          <>
            <TextInput
              label="Invite code"
              placeholder="XXXX XXXX XXXX XXXX"
              value={code}
              onChangeText={(t) => setCode(formatCode(t))}
              wrapperStyle={gutters.marginBottom_12}
            />
            <TextInput
              label="Full name (optional)"
              value={fullName}
              onChangeText={setFullName}
              wrapperStyle={gutters.marginBottom_12}
            />
            <TextInput
              label="Phone (optional)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              wrapperStyle={gutters.marginBottom_12}
            />
            {error ? (
              <Text color="error" style={gutters.marginBottom_12}>
                {error}
              </Text>
            ) : null}
            <Button text="Verify" onPress={() => void submit()} isLoading={loading} disabled={loading} />
          </>
        )}
      </ScrollView>
    </SafeScreen>
  );
}
