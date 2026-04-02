// FILE: /sessions/nice-sweet-cori/mnt/Mahfil Fund/apps/mobile/src/modules/audit-logs/AuditLogsScreen.tsx

import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { getAdminApi } from '@/api/client';
import { useTheme } from '@/theme';
import { SafeScreen } from '@/shared/components/templates';
import FlashList from '@/shared/components/organisms/flash-list/FlashList';
import Text from '@/shared/components/atoms/text/Text';
import { Card } from '@/shared/components/atoms';
import { ArrowBackIcon } from '@/shared/components/atoms/svg-icons/AppSvgIcons';
import rs from '@/shared/utilities/responsiveSize';

interface AuditLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  actorId: string;
  createdAt: string;
  changes?: Record<string, any>;
}

const AuditLogsScreen: React.FC = () => {
  const { colors, gutters, layout } = useTheme();
  const navigation = useNavigation<any>();

  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['audit-logs', entityTypeFilter, actionFilter],
    queryFn: async () => {
      const api = getAdminApi();
      const params = new URLSearchParams({
        page: '1',
        pageSize: '50',
        ...(entityTypeFilter !== 'all' && { entityType: entityTypeFilter }),
        ...(actionFilter !== 'all' && { action: actionFilter }),
      });
      const response = await api.get(`/audit-logs?${params.toString()}`);
      return response.data as { logs?: AuditLog[]; total?: number };
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
        filterSection: {
          paddingHorizontal: rs(16),
          paddingVertical: rs(12),
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.divider,
          gap: rs(12),
        },
        filterRow: {
          flexDirection: 'row',
          gap: rs(8),
          alignItems: 'center',
        },
        filterLabel: {
          minWidth: rs(80),
        },
        filterOptions: {
          flexDirection: 'row',
          gap: rs(6),
          flex: 1,
        },
        filterButton: {
          paddingHorizontal: rs(8),
          paddingVertical: rs(6),
          borderRadius: rs(4),
          borderWidth: 1,
        },
        logRow: {
          marginHorizontal: rs(16),
          marginVertical: rs(8),
        },
        logContent: {
          gap: rs(8),
        },
        logHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: rs(8),
        },
        logAction: {
          paddingHorizontal: rs(8),
          paddingVertical: rs(4),
          borderRadius: rs(4),
        },
        logMeta: {
          flexDirection: 'row',
          gap: rs(12),
          flexWrap: 'wrap',
        },
      }),
    [colors],
  );

  const actionColor = useCallback((action: string) => {
    const colorMap: Record<string, string> = {
      CREATE: colors.success,
      UPDATE: colors.warning,
      DELETE: colors.error,
    };
    return colorMap[action] || colors.secondary;
  }, [colors]);

  const getRelativeTime = useCallback((dateString: string): string => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return past.toLocaleDateString('en-BD');
  }, []);

  const renderItem = useCallback(
    ({ item: log }: { item: AuditLog }) => (
      <Card variant="outlined" padding={rs(12)} style={styles.logRow}>
        <View style={styles.logContent}>
          <View style={styles.logHeader}>
            <View
              style={[
                styles.logAction,
                { backgroundColor: actionColor(log.action) },
              ]}
            >
              <Text variant="body3" color="white">
                {log.action}
              </Text>
            </View>
            <Text variant="body2" color="primary" style={{ flex: 1 }}>
              {log.action} on {log.entityType}
            </Text>
          </View>

          <View style={styles.logMeta}>
            <View>
              <Text variant="body3" color="secondary">
                ID: {log.entityId}
              </Text>
            </View>
            <View>
              <Text variant="body3" color="secondary">
                By: {log.actorId}
              </Text>
            </View>
            <View>
              <Text variant="body3" color="secondary">
                {getRelativeTime(log.createdAt)}
              </Text>
            </View>
          </View>

          {log.changes && Object.keys(log.changes).length > 0 && (
            <Text variant="body3" color="secondary" numberOfLines={2}>
              Changes: {JSON.stringify(log.changes).substring(0, 50)}...
            </Text>
          )}
        </View>
      </Card>
    ),
    [styles, colors, actionColor, getRelativeTime],
  );

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowBackIcon width={rs(24)} height={rs(24)} color={colors.primary} />
        </TouchableOpacity>
        <Text variant="heading2" style={styles.headerTitle}>
          Audit Logs
        </Text>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.filterRow}>
          <Text variant="body3" color="secondary" style={styles.filterLabel}>
            Entity
          </Text>
          <View style={styles.filterOptions}>
            {['all', 'event', 'donor', 'donation', 'expense', 'user'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterButton,
                  {
                    borderColor: entityTypeFilter === type ? colors.primary : colors.divider,
                    backgroundColor:
                      entityTypeFilter === type ? colors.primary : colors.white,
                  },
                ]}
                onPress={() => setEntityTypeFilter(type)}
              >
                <Text
                  variant="body3"
                  color={entityTypeFilter === type ? 'white' : 'primary'}
                  numberOfLines={1}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterRow}>
          <Text variant="body3" color="secondary" style={styles.filterLabel}>
            Action
          </Text>
          <View style={styles.filterOptions}>
            {['all', 'CREATE', 'UPDATE', 'DELETE'].map((action) => (
              <TouchableOpacity
                key={action}
                style={[
                  styles.filterButton,
                  {
                    borderColor: actionFilter === action ? colors.primary : colors.divider,
                    backgroundColor:
                      actionFilter === action ? colors.primary : colors.white,
                  },
                ]}
                onPress={() => setActionFilter(action)}
              >
                <Text
                  variant="body3"
                  color={actionFilter === action ? 'white' : 'primary'}
                  numberOfLines={1}
                >
                  {action}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <FlashList
        data={data?.logs || []}
        estimatedItemSize={140}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        isLoading={isLoading}
        error={isError ? (error instanceof Error ? error.message : 'Failed to load') : ''}
        refetch={refetch}
        emptyText="No audit logs"
        emptyDescription="No logs match the current filters"
      />
    </SafeScreen>
  );
};

export default AuditLogsScreen;
