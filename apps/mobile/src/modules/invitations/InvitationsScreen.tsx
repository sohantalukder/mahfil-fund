// FILE: /sessions/nice-sweet-cori/mnt/Mahfil Fund/apps/mobile/src/modules/invitations/InvitationsScreen.tsx

import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminApi } from '@/api/client';
import { useTheme } from '@/theme';
import { SafeScreen } from '@/shared/components/templates';
import FlashList from '@/shared/components/organisms/flash-list/FlashList';
import Text from '@/shared/components/atoms/text/Text';
import Button from '@/shared/components/atoms/buttons/Button';
import { Badge, Card, Dialog } from '@/shared/components/atoms';
import { ArrowBackIcon, PlusIcon, TrashIcon } from '@/shared/components/atoms/svg-icons/AppSvgIcons';
import rs from '@/shared/utilities/responsiveSize';

interface InvitationRow {
  id: string;
  code: string;
  status: 'PENDING' | 'USED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  usedAt?: string;
  inviteeEmail?: string;
}

interface CreateInvitationState {
  visible: boolean;
  expiresInDays: 7 | 14 | 30;
  isCreating: boolean;
  generatedCode?: string;
}

const InvitationsScreen: React.FC = () => {
  const { colors, gutters, layout } = useTheme();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [createState, setCreateState] = useState<CreateInvitationState>({
    visible: false,
    expiresInDays: 14,
    isCreating: false,
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['invitations', statusFilter],
    queryFn: async () => {
      const api = getAdminApi();
      const params = new URLSearchParams({
        page: '1',
        pageSize: '25',
        ...(statusFilter !== 'All' && { status: statusFilter }),
      });
      const response = await api.get(`/invitations?${params.toString()}`);
      return response.data as { invitations?: InvitationRow[]; total?: number };
    },
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: rs(16),
          paddingVertical: rs(12),
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.divider,
        },
        headerTitle: {
          flex: 1,
          marginLeft: rs(12),
        },
        filterSection: {
          paddingHorizontal: rs(16),
          paddingVertical: rs(12),
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.divider,
        },
        filterRow: {
          flexDirection: 'row',
          gap: rs(8),
        },
        row: {
          marginHorizontal: rs(16),
          marginVertical: rs(8),
        },
        rowContent: {
          gap: rs(8),
        },
        rowHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        codeText: {
          fontFamily: 'monospace',
          fontSize: rs(12),
        },
        metaRow: {
          flexDirection: 'row',
          gap: rs(12),
          alignItems: 'center',
          flexWrap: 'wrap',
        },
        actionButton: {
          paddingHorizontal: rs(12),
          paddingVertical: rs(6),
          borderRadius: rs(4),
          borderWidth: 1,
        },
        createModal: {
          paddingHorizontal: rs(16),
          paddingVertical: rs(16),
          gap: rs(16),
        },
        expiresButtonRow: {
          flexDirection: 'row',
          gap: rs(12),
        },
        expiresButton: {
          flex: 1,
          paddingVertical: rs(12),
          borderRadius: rs(8),
          borderWidth: 2,
          justifyContent: 'center',
          alignItems: 'center',
        },
        expiresButtonActive: {
          borderColor: colors.primary,
          backgroundColor: colors.primary,
        },
        expiresButtonInactive: {
          borderColor: colors.divider,
          backgroundColor: colors.white,
        },
        successCard: {
          marginHorizontal: rs(16),
          marginVertical: rs(12),
          backgroundColor: colors.success,
          paddingHorizontal: rs(12),
          paddingVertical: rs(12),
          borderRadius: rs(8),
          gap: rs(8),
        },
        codeDisplay: {
          backgroundColor: colors.white,
          padding: rs(12),
          borderRadius: rs(6),
          marginVertical: rs(8),
          justifyContent: 'center',
          alignItems: 'center',
        },
      }),
    [colors],
  );

  const statusColor = useCallback((status: string) => {
    const colorMap: Record<string, string> = {
      PENDING: colors.warning,
      USED: colors.success,
      EXPIRED: colors.error,
      CANCELLED: colors.secondary,
    };
    return colorMap[status] || colors.secondary;
  }, [colors]);

  const { mutate: createInvitation } = useMutation({
    mutationFn: async () => {
      const api = getAdminApi();
      const response = await api.post('/invitations', {
        expiresInDays: createState.expiresInDays,
      });
      return response.data as { code?: string };
    },
    onSuccess: (data) => {
      setCreateState((prev) => ({
        ...prev,
        isCreating: false,
        generatedCode: data.code || '',
      }));
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: (err) => {
      console.error('Create invitation error:', err);
      Alert.alert('Error', 'Failed to create invitation');
      setCreateState((prev) => ({ ...prev, isCreating: false }));
    },
  });

  const { mutate: deleteInvitation } = useMutation({
    mutationFn: async (id: string) => {
      const api = getAdminApi();
      await api.delete(`/invitations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: (err) => {
      console.error('Delete invitation error:', err);
      Alert.alert('Error', 'Failed to delete invitation');
    },
  });

  const handleCreateInvitation = useCallback(() => {
    setCreateState((prev) => ({ ...prev, visible: true }));
  }, []);

  const handleConfirmCreate = useCallback(() => {
    setCreateState((prev) => ({ ...prev, isCreating: true }));
    createInvitation();
  }, [createInvitation]);

  const handleCopyCode = useCallback(() => {
    if (createState.generatedCode) {
      Alert.alert('Success', 'Code copied to clipboard');
    }
  }, [createState.generatedCode]);

  const handleDeleteInvitation = useCallback((id: string) => {
    Alert.alert('Delete Invitation', 'Are you sure? This action cannot be undone.', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: () => deleteInvitation(id),
        style: 'destructive',
      },
    ]);
  }, [deleteInvitation]);

  const handleCloseCreate = useCallback(() => {
    if (createState.generatedCode) {
      setCreateState({
        visible: false,
        expiresInDays: 14,
        isCreating: false,
      });
    } else {
      setCreateState((prev) => ({ ...prev, visible: false }));
    }
  }, [createState.generatedCode]);

  const renderItem = useCallback(
    ({ item: invitation }: { item: InvitationRow }) => (
      <Card variant="outlined" padding={rs(12)} style={styles.row}>
        <View style={styles.rowContent}>
          <View style={styles.rowHeader}>
            <View style={{ flex: 1 }}>
              <Text variant="body2" color="primary">
                {invitation.inviteeEmail || 'Pending'}
              </Text>
              <Text variant="body3" color="secondary" style={styles.codeText}>
                {invitation.code.substring(0, 8)}...
              </Text>
            </View>
            <Badge
              text={invitation.status}
              bgColor={statusColor(invitation.status)}
              textColor={colors.white}
              size="small"
            />
          </View>

          <View style={styles.metaRow}>
            <Text variant="body3" color="secondary">
              Expires: {new Date(invitation.expiresAt).toLocaleDateString('en-BD')}
            </Text>
            {invitation.status === 'PENDING' && (
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: colors.error }]}
                onPress={() => handleDeleteInvitation(invitation.id)}
              >
                <TrashIcon width={rs(16)} height={rs(16)} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    ),
    [styles, colors, statusColor, handleDeleteInvitation],
  );

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowBackIcon width={rs(24)} height={rs(24)} color={colors.primary} />
        </TouchableOpacity>
        <Text variant="heading2" style={styles.headerTitle}>
          Invitations
        </Text>
        <TouchableOpacity onPress={handleCreateInvitation}>
          <PlusIcon width={rs(24)} height={rs(24)} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.filterRow}>
          {['All', 'Pending', 'Used', 'Expired', 'Cancelled'].map((status) => (
            <Badge
              key={status}
              text={status}
              bgColor={statusFilter === status ? colors.primary : colors.secondary}
              textColor={colors.white}
              size="small"
            />
          ))}
        </View>
      </View>

      <FlashList
        data={data?.invitations || []}
        estimatedItemSize={120}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        isLoading={isLoading}
        error={isError ? (error instanceof Error ? error.message : 'Failed to load') : ''}
        refetch={refetch}
        emptyText="No invitations"
        emptyDescription="Create an invitation to get started"
      />

      <Dialog
        visible={createState.visible && !createState.generatedCode}
        title="Create Invitation"
        description="How many days should this invitation be valid?"
        buttons={[
          {
            label: 'Cancel',
            type: 'outline',
            onPress: handleCloseCreate,
          },
          {
            label: 'Create',
            type: 'primary',
            onPress: handleConfirmCreate,
            isLoading: createState.isCreating,
          },
        ]}
        onDismiss={handleCloseCreate}
      />

      {createState.generatedCode && (
        <ScrollView style={[styles.createModal, { backgroundColor: colors.white }]}>
          <View style={{ alignItems: 'center', gap: rs(12) }}>
            <Text variant="heading2" color="primary">
              Invitation Created!
            </Text>
            <Text variant="body2" color="secondary">
              Share this code with the invitee
            </Text>

            <View
              style={[
                styles.codeDisplay,
                { borderWidth: 2, borderColor: colors.primary },
              ]}
            >
              <Text variant="heading1" color="primary" style={styles.codeText}>
                {createState.generatedCode}
              </Text>
            </View>

            <Text variant="body3" color="secondary">
              Expires in {createState.expiresInDays} days
            </Text>

            <View style={{ width: '100%', gap: rs(8) }}>
              <Button
                text="Copy Code"
                onPress={handleCopyCode}
                variant="primary"
              />
              <Button
                text="Done"
                onPress={handleCloseCreate}
                variant="secondary"
              />
            </View>
          </View>
        </ScrollView>
      )}

      {createState.visible && !createState.generatedCode && (
        <View style={styles.createModal}>
          <Text variant="body2" color="primary">
            Validity Period
          </Text>
          <View style={styles.expiresButtonRow}>
            {([7, 14, 30] as const).map((days) => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.expiresButton,
                  createState.expiresInDays === days
                    ? styles.expiresButtonActive
                    : styles.expiresButtonInactive,
                ]}
                onPress={() =>
                  setCreateState((prev) => ({
                    ...prev,
                    expiresInDays: days,
                  }))
                }
              >
                <Text
                  variant="body2"
                  color={
                    createState.expiresInDays === days ? 'white' : 'primary'
                  }
                >
                  {days} days
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </SafeScreen>
  );
};

export default InvitationsScreen;
