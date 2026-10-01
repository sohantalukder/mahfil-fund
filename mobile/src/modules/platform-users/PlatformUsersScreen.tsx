import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { getAdminApi } from '@/api/client';
import { useMe } from '@/hooks/useMe';
import { useAuth } from '@/contexts/AuthContext';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import { Badge, BottomSheet, Button, Card, TextInput } from '@/shared/components/atoms';
import { ArrowBackIcon } from '@/shared/components/atoms/svg-icons/AppSvgIcons';
import { useTheme } from '@/theme';

type PlatformUser = {
  id: string;
  email: string;
  fullName?: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
};

export default function PlatformUsersScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { session } = useAuth();
  const { isSuperAdmin } = useMe(Boolean(session));
  const [resetUser, setResetUser] = useState<PlatformUser | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');

  const users = useQuery({
    queryKey: ['platform-users'],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const response = await getAdminApi().get('/platform/users?page=1&pageSize=100');
      if (!response.success) throw new Error(response.error.message);
      return ((response.data as { users?: PlatformUser[] }).users ?? []);
    },
  });

  const update = useMutation({
    mutationFn: async (input: { user: PlatformUser; kind: 'status' | 'super'; value: boolean }) => {
      const path = input.kind === 'status' ? 'status' : 'super-admin';
      const body = input.kind === 'status' ? { isActive: input.value } : { isSuperAdmin: input.value };
      const response = await getAdminApi().patch(`/platform/users/${input.user.id}/${path}`, body);
      if (!response.success) throw new Error(response.error.message);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['platform-users'] }),
    onError: (error) => Alert.alert('Unable to update account', error instanceof Error ? error.message : 'Please try again.'),
  });

  const resetPassword = useMutation({
    mutationFn: async () => {
      if (!resetUser || temporaryPassword.length < 10) throw new Error('Temporary password must contain at least 10 characters.');
      const response = await getAdminApi().post(`/platform/users/${resetUser.id}/temporary-password`, { temporaryPassword });
      if (!response.success) throw new Error(response.error.message);
    },
    onSuccess: () => {
      setResetUser(null);
      setTemporaryPassword('');
      void queryClient.invalidateQueries({ queryKey: ['platform-users'] });
    },
    onError: (error) => Alert.alert('Unable to reset password', error instanceof Error ? error.message : 'Please try again.'),
  });

  if (!isSuperAdmin) {
    return <SafeScreen><View style={styles.empty}><Text color="secondary">Platform super-admin access is required.</Text></View></SafeScreen>;
  }

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ArrowBackIcon color={colors.text} size={24} /></TouchableOpacity>
        <Text variant="heading2">Platform accounts</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {users.data?.map((user) => (
          <Card key={user.id} variant="outlined" padding={14} style={styles.card}>
            <Text variant="body1" weight="semibold">{user.fullName || user.email}</Text>
            <Text variant="body3" color="secondary">{user.email}</Text>
            <View style={styles.badges}>
              <Badge text={user.isActive ? 'ACTIVE' : 'DISABLED'} bgColor={user.isActive ? colors.success : colors.error} textColor={colors.white} size="small" />
              {user.isSuperAdmin ? <Badge text="SUPER ADMIN" bgColor={colors.primary} textColor={colors.white} size="small" /> : null}
              {user.mustChangePassword ? <Badge text="PASSWORD CHANGE REQUIRED" bgColor={colors.warning} textColor={colors.white} size="small" /> : null}
            </View>
            <View style={styles.actions}>
              <Button text={user.isActive ? 'Disable' : 'Activate'} onPress={() => update.mutate({ user, kind: 'status', value: !user.isActive })} />
              <Button text={user.isSuperAdmin ? 'Revoke admin' : 'Grant admin'} onPress={() => update.mutate({ user, kind: 'super', value: !user.isSuperAdmin })} />
              <Button text="Temporary password" onPress={() => setResetUser(user)} />
            </View>
          </Card>
        ))}
      </ScrollView>
      <BottomSheet visible={Boolean(resetUser)} onRequestClose={() => setResetUser(null)} maxHeight={320}>
        <View style={styles.dialog}>
          <Text variant="heading3">Set temporary password</Text>
          <TextInput placeholder="At least 10 characters" value={temporaryPassword} onChangeText={setTemporaryPassword} secureTextEntry />
          <Button text="Save" onPress={() => resetPassword.mutate()} isLoading={resetPassword.isPending} />
        </View>
      </BottomSheet>
    </SafeScreen>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.gray7 },
    content: { padding: 16, gap: 12 },
    card: { gap: 8 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    actions: { gap: 8, marginTop: 6 },
    empty: { padding: 24 },
    dialog: { gap: 16 },
  });
}
