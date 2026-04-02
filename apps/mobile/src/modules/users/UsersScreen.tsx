// FILE: /sessions/nice-sweet-cori/mnt/Mahfil Fund/apps/mobile/src/modules/users/UsersScreen.tsx

import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminApi } from '@/api/client';
import { useTheme } from '@/theme';
import { SafeScreen } from '@/shared/components/templates';
import FlashList from '@/shared/components/organisms/flash-list/FlashList';
import Text from '@/shared/components/atoms/text/Text';
import { Badge, Card, Dialog } from '@/shared/components/atoms';
import { ArrowBackIcon } from '@/shared/components/atoms/svg-icons/AppSvgIcons';
import { canManageUsers, activeCommunityRole } from '@/lib/guards';
import { useAuth } from '@/contexts/AuthContext';
import rs from '@/shared/utilities/responsiveSize';

interface UserRow {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: 'ACTIVE' | 'INACTIVE';
}

interface RoleEditState {
  userId: string;
  roles: string[];
}

const UsersScreen: React.FC = () => {
  const { colors, gutters, layout } = useTheme();
  const navigation = useNavigation<any>();
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  const userRole = activeCommunityRole(authUser);
  const canEdit = canManageUsers(userRole);

  const [roleEditState, setRoleEditState] = useState<RoleEditState | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const api = getAdminApi();
      const params = new URLSearchParams({
        page: '1',
        pageSize: '25',
      });
      const response = await api.get(`/users?${params.toString()}`);
      return response.data as { users?: UserRow[]; total?: number };
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
          borderBottomColor: colors.divider,
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
      super_admin: '#FF5630',
      collector: '#E8A800',
      viewer: '#00B8D9',
    };
    return roleColorMap[role] || colors.secondary;
  }, [colors]);

  const { mutate: updateRoles, isPending: isUpdatingRoles } = useMutation({
    mutationFn: async (userId: string) => {
      if (!roleEditState || roleEditState.userId !== userId) return;
      const api = getAdminApi();
      await api.put(`/users/${userId}/roles`, { roles: roleEditState.roles });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setRoleEditState(null);
    },
    onError: (err) => {
      console.error('Update roles error:', err);
      Alert.alert('Error', 'Failed to update user roles');
    },
  });

  const handleEditRoles = useCallback((user: UserRow) => {
    if (!canEdit) {
      Alert.alert('Permission Denied', 'You do not have permission to manage users');
      return;
    }
    setRoleEditState({
      userId: user.id,
      roles: user.roles,
    });
  }, [canEdit]);

  const toggleRole = useCallback((role: string) => {
    if (!roleEditState) return;
    setRoleEditState((prev) => {
      if (!prev) return prev;
      const newRoles = prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role];
      return { ...prev, roles: newRoles };
    });
  }, []);

  const handleSaveRoles = useCallback(() => {
    if (roleEditState) {
      updateRoles(roleEditState.userId);
    }
  }, [roleEditState, updateRoles]);

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
          </View>
        </View>
      </Card>
    ),
    [styles, colors, getInitials, getRoleColor, canEdit, handleEditRoles],
  );

  const roleCheckboxButtons = useMemo(() => {
    if (!roleEditState) return [];
    const availableRoles = ['admin', 'collector', 'viewer'];
    return availableRoles.map((role) => ({
      label: `${roleEditState.roles.includes(role) ? '✓ ' : ''}${role}`,
      type: 'secondary' as const,
      onPress: () => toggleRole(role),
    }));
  }, [roleEditState, toggleRole]);

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowBackIcon width={rs(24)} height={rs(24)} color={colors.primary} />
        </TouchableOpacity>
        <Text variant="heading2" style={styles.headerTitle}>
          Users
        </Text>
      </View>

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
        title="Edit User Roles"
        description={roleEditState ? `Update roles for user` : ''}
        buttons={[
          {
            label: 'Cancel',
            type: 'outline',
            onPress: () => setRoleEditState(null),
          },
          {
            label: 'Save',
            type: 'primary',
            onPress: handleSaveRoles,
            isLoading: isUpdatingRoles,
          },
        ]}
        onDismiss={() => setRoleEditState(null)}
      />
    </SafeScreen>
  );
};

export default UsersScreen;
