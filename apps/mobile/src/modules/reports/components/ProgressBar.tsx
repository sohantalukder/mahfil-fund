import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Text from '@/shared/components/atoms/text/Text';
import { useTheme } from '@/theme';
import type { Colors } from '@/theme/types/colors';

const getStyles = (colors: Colors) =>
  StyleSheet.create({
    row: {
      marginBottom: 12,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.gray8,
      overflow: 'hidden',
    },
    fill: {
      height: 8,
      borderRadius: 4,
    },
  });

interface ProgressBarProps {
  label: string;
  percentage: number;
  amount?: string;
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  percentage,
  amount,
  color,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const clampedPct = Math.min(100, Math.max(0, percentage));

  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text variant="body2">{label}</Text>
        <Text variant="body3" color="secondary">
          {`${clampedPct}%${amount ? ` (${amount})` : ''}`}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${clampedPct}%`,
              backgroundColor: color ?? colors.primary,
            },
          ]}
        />
      </View>
    </View>
  );
};
