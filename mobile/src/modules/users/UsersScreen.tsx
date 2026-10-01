import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, TextInput as NativeTextInput } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminApi } from '@/api/client';
import { useTheme } from '@/theme';
import { SafeScreen } from '@/shared/components/templates';
import FlashList from '@/shared/components/organisms/flash-list/FlashList';
import Text from '@/shared/components/atoms/text/Text';
import { Badge, Button, Card, Dialog } from '@/shared/components/atoms';
import { ArrowBackIcon } from '@/shared/components/atoms/svg-icons/AppSvgIcons';
import { canManageUsers, activeCommunityRole } from '@/lib/guards';
import { useAuth } from '@/contexts/AuthContext';
import { useCommunity } from '@/contexts/CommunityContext';
import { useMe } from '@/hooks/useMe';
import rs from '@/shared/utilities/responsiveSize';
import type { MenuStackParamList } from '@/navigation/types';

interface UserRow {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: 'ACTIVE' | 'INACTIVE';
  mustChangePassword: boolean;
}

interface RoleEditState {
  userId: string;
  status: UserRow['status'];
}

const UsersScreen: React.FC = () => {
  const { colors, gutters } = useTheme();
  const navigation = useNavigation<NavigationProp<MenuStackParamList>>();
  const { session } = useAuth();
  const { activeCommunity } = useCommunity();
  useMe(!!session);
  const queryClient = useQueryClient();

  const userRole = activeCommunityRole(activeCommunity);
  const canEdit = canManageUsers(userRole);

  const [roleEditState, setRoleEditState] = useState<RoleEditState | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [createKind, setCreateKind] = useState<'new' | 'existing'>('new');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'collector' | 'viewer'>('viewer');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const api = getAdminApi();
      const params = new URLSearchParams({
        page: '1',
        pageSize: '25',
      });
      const response = await api.get(`/members?${params.toString()}`);
      if (!response.success) throw new Error('Failed to fetch users');
      const raw = response.data as { members?: Array<{ role: string; status: string; user: { id: string; fullName?: string; email: string; mustChangePassword?: boolean } }>; total?: number };
      return { total: raw.total, users: (raw.members ?? []).map((member) => ({
        id: member.user.id, name: member.user.fullName || member.user.email, email: member.user.email,
        roles: [member.role], status: member.status === 'ACTIVE' ? 'ACTIVE' as const : 'INACTIVE' as const,
        mustChangePassword: member.user.mustChangePassword ?? false,
      })) };
    },
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: rs(16),
          paddingVertical: rs(12),
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.gray7,
        },
        headerTitle: {
          flex: 1,
          marginLeft: rs(12),
        },
        row: {
          marginHorizontal: rs(16),
          marginVertical: rs(8),
        },
        rowContent: {
          gap: rs(8),
        },
        userHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: rs(12),
          marginBottom: rs(8),
        },
        avatar: {
          width: rs(40),
          height: rs(40),
          borderRadius: rs(20),
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
        },
        userInfo: {
          flex: 1,
        },
        rolesList: {
          flexDirection: 'row',
          gap: rs(8),
          flexWrap: 'wrap',
        },
        editButton: {
          paddingHorizontal: rs(12),
          paddingVertical: rs(6),
          borderRadius: rs(4),
          borderWidth: 1,
          borderColor: colors.primary,
        },
      }),
    [colors],
  );

  const getInitials = useCallback((name: string): string => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }, []);

  const getRoleColor = useCallback((role: string): string => {
    const roleColorMap: Record<string, string> = {
      admin: '#8A2BE2',
      collector: '#E8A800',
      viewer: '#00B8D9',
    };
    return roleColorMap[role] || colors.secondary;
  }, [colors]);

  const { mutate: updateMembership, isPending: isUpdatingMembership } = useMutation({
    mutationFn: async ({ userId, role, status }: { userId: string; role?: string; status?: 'ACTIVE' | 'SUSPENDED' }) => {
      const api = getAdminApi();
      const response = await api.patch(`/members/${userId}`, { ...(role ? { role } : {}), ...(status ? { status } : {}) });
      if (!response.success) throw new Error(response.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setRoleEditState(null);
    },
    onError: (err) => {
      console.error('Update membership error:', err);
      Alert.alert('Error', 'Failed to update membership');
    },
  });

  const handleEditRoles = useCallback((user: UserRow) => {
    if (!canEdit) {
      Alert.alert('Permission Denied', 'You do not have permission to manage users');
      return;
    }
    setRoleEditState({
      userId: user.id,
      status: user.status,
    });
  }, [canEdit]);

  const createMember = useMutation({
    mutationFn: async () => {
      const body = createKind === 'new'
        ? { kind: 'new', email, fullName, temporaryPassword, role: newRole }
        : { kind: 'existing', email, role: newRole };
      const response = await getAdminApi().post('/members', body);
      if (!response.success) throw new Error(response.error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowAdd(false); setEmail(''); setFullName(''); setTemporaryPassword('');
    },
    onError: (caught) => Alert.alert('Error', caught instanceof Error ? caught.message : 'Unable to add member'),
  });

  const renderItem = useCallback(
    ({ item: user }: { item: UserRow }) => (
      <Card variant="outlined" padding={rs(12)} style={styles.row}>
        <View style={styles.rowContent}>
          <View style={styles.userHeader}>
            <View style={styles.avatar}>
              <Text variant="heading3" color="white">
                {getInitials(user.name)}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text variant="body1" color="primary" numberOfLines={1}>
                {user.name}
              </Text>
              <Text variant="body3" color="secondary" numberOfLines={1}>
                {user.email}
              </Text>
            </View>
            {canEdit && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEditRoles(user)}
              >
                <Text variant="body3" color="primary">
                  Edit
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.rolesList}>
            {user.roles.map((role) => (
              <Badge
                key={role}
                text={role}
                bgColor={getRoleColor(role)}
                textColor={colors.white}
                size="small"
              />
            ))}
            {user.status && (
              <Badge
                text={user.status}
                bgColor={user.status === 'ACTIVE' ? colors.success : colors.secondary}
                textColor={colors.white}
                size="small"
              />
            )}
            {user.mustChangePassword && (
              <Badge
                text="PASSWORD CHANGE REQUIRED"
                bgColor={colors.warning}
                textColor={colors.white}
                size="small"
              />
            )}
          </View>
        </View>
      </Card>
    ),
    [styles, colors, getInitials, getRoleColor, canEdit, handleEditRoles],
  );

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowBackIcon size={rs(24)} color={colors.primary} />
        </TouchableOpacity>
        <Text variant="heading2" style={styles.headerTitle}>
          Community Members
        </Text>
        {canEdit && <Button text={showAdd ? 'Close' : 'Add'} onPress={() => setShowAdd((value) => !value)} />}
      </View>

      {showAdd && <Card variant="outlined" padding={rs(12)} style={styles.row}>
        <View style={styles.rowContent}>
          <TouchableOpacity onPress={() => setCreateKind((value) => value === 'new' ? 'existing' : 'new')}>
            <Text color="primary">{createKind === 'new' ? 'Create new account' : 'Add existing account'} (tap to switch)</Text>
          </TouchableOpacity>
          <NativeTextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={{ borderWidth: 1, borderColor: colors.gray7, borderRadius: 8, padding: 10, color: colors.primary }} />
          {createKind === 'new' && <>
            <NativeTextInput placeholder="Full name" value={fullName} onChangeText={setFullName} style={{ borderWidth: 1, borderColor: colors.gray7, borderRadius: 8, padding: 10, color: colors.primary }} />
            <NativeTextInput placeholder="Temporary password (10+ characters)" secureTextEntry value={temporaryPassword} onChangeText={setTemporaryPassword} style={{ borderWidth: 1, borderColor: colors.gray7, borderRadius: 8, padding: 10, color: colors.primary }} />
          </>}
          <TouchableOpacity onPress={() => setNewRole((role) => role === 'viewer' ? 'collector' : role === 'collector' ? 'admin' : 'viewer')}>
            <Text>Role: {newRole} (tap to change)</Text>
          </TouchableOpacity>
          <Button text={createMember.isPending ? 'Saving…' : 'Add member'} disabled={!email || (createKind === 'new' && (fullName.length < 2 || temporaryPassword.length < 10)) || createMember.isPending} onPress={() => createMember.mutate()} />
        </View>
      </Card>}

      <FlashList
        data={data?.users || []}
        estimatedItemSize={140}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        isLoading={isLoading}
        error={isError ? (error instanceof Error ? error.message : 'Failed to load') : ''}
        refetch={refetch}
        emptyText="No users"
        emptyDescription="No users found in this community"
        contentContainerStyle={gutters.paddingHorizontal_16}
      />

      <Dialog
        visible={!!roleEditState}
        title="Change Community Role"
        description="Choose one tenant role. Platform super-admin access is managed separately."
        buttons={[
          {
            label: 'Cancel',
            type: 'outline',
            onPress: () => setRoleEditState(null),
          },
          {
            label: 'Viewer',
            type: 'primary',
            onPress: () => roleEditState && updateMembership({ userId: roleEditState.userId, role: 'viewer' }),
            isLoading: isUpdatingMembership,
          },
          {
            label: 'Collector', type: 'primary',
            onPress: () => roleEditState && updateMembership({ userId: roleEditState.userId, role: 'collector' }),
            isLoading: isUpdatingMembership,
          },
          {
            label: 'Admin', type: 'primary',
            onPress: () => roleEditState && updateMembership({ userId: roleEditState.userId, role: 'admin' }),
            isLoading: isUpdatingMembership,
          },
          {
            label: roleEditState?.status === 'ACTIVE' ? 'Suspend' : 'Reactivate',
            type: 'outline',
            onPress: () => roleEditState && updateMembership({
              userId: roleEditState.userId,
              status: roleEditState.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
            }),
            isLoading: isUpdatingMembership,
          },
        ]}
        onDismiss={() => setRoleEditState(null)}
      />
    </SafeScreen>
  );
};

export default UsersScreen;
