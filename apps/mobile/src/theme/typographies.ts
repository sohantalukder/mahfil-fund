import { StyleSheet } from 'react-native';
import { fontWeight, generateFontSizes } from '@/theme/fonts';
import { FontColors } from './types/fonts';

const lineHeight = (size: number, percentage: number) => {
  return size * (percentage / 100);
};

export const typographies = (colors: FontColors) =>
  StyleSheet.create({
    heading1: {
      color: colors.text.color,
      fontFamily: fontWeight.bold,
      fontSize: generateFontSizes().size_32.fontSize,
      textAlign: 'left',
    },
    heading2: {
      color: colors.text.color,
      fontFamily: fontWeight.bold,
      fontSize: generateFontSizes().size_24.fontSize,
      lineHeight: lineHeight(24, 120),
      textAlign: 'left',
    },
    heading3: {
      color: colors.text.color,
      fontFamily: fontWeight.bold,
      fontSize: generateFontSizes().size_18.fontSize,
      lineHeight: lineHeight(18, 120),
      textAlign: 'left',
    },
    // eslint-disable-next-line react-native/sort-styles
    body1: {
      color: colors.text.color,
      fontFamily: fontWeight.regular,
      fontSize: generateFontSizes().size_16.fontSize,
      lineHeight: lineHeight(16, 120),
      textAlign: 'left',
    },
    body2: {
      color: colors.text.color,
      fontFamily: fontWeight.regular,
      fontSize: generateFontSizes().size_14.fontSize,
      lineHeight: lineHeight(14, 120),
      textAlign: 'left',
    },
    body3: {
      color: colors.text.color,
      fontFamily: fontWeight.regular,
      fontSize: generateFontSizes().size_12.fontSize,
      textAlign: 'left',
    },
  });
