import { useMemo } from 'react';
import { SectionList, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Text from '@/shared/components/atoms/text/Text';
import { useTheme } from '@/theme';
import type { NotificationItem, NotificationType } from '../types';
import { NotificationItemComponent } from '../components/NotificationItem';
import { EmptyNotifications } from '../components/EmptyNotifications';
import { groupByDay } from '../useNotifications';
import { getStyles } from '../styles';
import Divider from '@/shared/components/atoms/divider/Divider';

interface NotificationsListProps {
  notifications: NotificationItem[];
  filterType?: NotificationType | null;
}

export function NotificationsList({ notifications, filterType }: NotificationsListProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const filtered = useMemo(() => {
    if (!filterType) return notifications;
    return notifications.filter((n) => n.type === filterType);
  }, [notifications, filterType]);

  const sections = useMemo(() => groupByDay(filtered, t), [filtered, t]);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index, section }) => (
        <>
          <NotificationItemComponent item={item} />
          {index < section.data.length - 1 && <Divider />}
        </>
      )}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text variant="body3" weight="semibold" style={styles.sectionHeaderText}>
            {section.title}
          </Text>
        </View>
      )}
      ListEmptyComponent={<EmptyNotifications />}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
    />
  );
}
