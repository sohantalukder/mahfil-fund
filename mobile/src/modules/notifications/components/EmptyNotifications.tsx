import { useMemo } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Text from '@/shared/components/atoms/text/Text';
import { useTheme } from '@/theme';
import { getStyles } from '../styles';
import IconByVariant from '@/shared/components/atoms/icon-by-variant/IconByVariant';

export function EmptyNotifications() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <IconByVariant path="notification" width={32} height={32} color={colors.gray5} />
      </View>
      <Text variant="body1" weight="semibold" style={{ textAlign: 'center' }}>
        {t('notifications.empty_title')}
      </Text>
      <Text variant="body2" color="secondary" style={{ textAlign: 'center' }}>
        {t('notifications.empty_subtitle')}
      </Text>
    </View>
  );
}
