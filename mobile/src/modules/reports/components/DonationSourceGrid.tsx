import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Text from '@/shared/components/atoms/text/Text';
import { useTheme } from '@/theme';
import type { Colors } from '@/theme/types/colors';

const getStyles = (colors: Colors) =>
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    cell: {
      width: '50%',
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    cellHighlighted: {
      backgroundColor: colors.gray9,
      borderRadius: 12,
      paddingHorizontal: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 6,
    },
  });

interface SourceItem {
  label: string;
  percentage: number;
  color: string;
  isHighlighted?: boolean;
}

interface DonationSourceGridProps {
  data: SourceItem[];
}

export const DonationSourceGrid: React.FC<DonationSourceGridProps> = ({
  data,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={styles.grid}>
      {data.map((item) => (
        <View
          key={item.label}
          style={[styles.cell, item.isHighlighted && styles.cellHighlighted]}
        >
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text variant="body3" color="secondary">
              {item.label}
            </Text>
          </View>
          <Text variant="heading3" weight="bold">
            {`${item.percentage}%`}
          </Text>
        </View>
      ))}
    </View>
  );
};
