import { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Text from '@/shared/components/atoms/text/Text';
import { useTheme } from '@/theme';
import type { NotificationItem as NotificationItemType } from '../types';
import { getStyles } from '../styles';
import IconByVariant from '@/shared/components/atoms/icon-by-variant/IconByVariant';
import { ChartIcon, DonationIcon, ReceiptIcon } from '@/shared/components/atoms/svg-icons/AppSvgIcons';

const LOGO_BG = '#1A5C30';

function timeAgo(iso: string, t: (key: string, opts?: object) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return t('notifications.time_just_now');
  if (hours < 1) return t('notifications.time_minutes_ago', { n: minutes });
  if (days < 1) return t('notifications.time_hours_ago', { n: hours });
  return t('notifications.time_days_ago', { n: days });
}

interface NotificationItemProps {
  item: NotificationItemType;
}

export function NotificationItemComponent({ item }: NotificationItemProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const isDonation = item.type === 'donation';
  const iconColor = isDonation ? colors.white : colors.gray4;

  const IconComponent = useMemo(() => {
    if (item.type === 'donation') return <DonationIcon color={iconColor} size={20} />;
    if (item.type === 'expense') return <ReceiptIcon color={iconColor} size={20} />;
    if (item.type === 'report') return <ChartIcon color={iconColor} size={20} />;
    return (
      <IconByVariant path="refresh" width={20} height={20} color={iconColor} />
    );
  }, [item.type, iconColor]);

  return (
    <View style={[styles.item, !item.isRead && styles.itemUnread]}>
      <View
        style={[
          styles.iconCircle,
          isDonation ? styles.iconCircleDonation : styles.iconCircleDefault,
        ]}
      >
        {IconComponent}
      </View>

      <View style={styles.itemContent}>
        <View style={styles.itemTitleRow}>
          <Text variant="body2" weight="semibold" style={styles.itemTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text variant="body3" style={styles.itemTime}>
            {timeAgo(item.createdAt, t)}
          </Text>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
        <Text variant="body3" color="secondary">
          {item.body}
        </Text>
        {item.hasDownloadPdf && (
          <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.7}>
            <Text variant="body3" weight="semibold" style={styles.downloadBtnText}>
              {t('notifications.download_pdf')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
