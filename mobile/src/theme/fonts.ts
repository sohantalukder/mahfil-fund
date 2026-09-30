import type { UnionConfiguration } from '@/theme/types/config';
import type { FontColors, FontSizes } from '@/theme/types/fonts';
import type { TextStyle } from 'react-native';

import { config } from '@/theme/_config';
import { responsiveFontSize } from '@/shared/utilities/responsiveSize';

export const generateFontColors = (configuration: UnionConfiguration) => {
  return Object.entries(configuration.fonts.colors).reduce<FontColors>((accumulator, [key, value]) => {
    return Object.assign(accumulator, {
      [key]: {
        color: value,
      },
    });
  }, {} as FontColors);
};

export const generateFontSizes = () => {
  return config.fonts.sizes.reduce<FontSizes>((accumulator: FontSizes, size: number) => {
    return Object.assign(accumulator, {
      [`size_${size}`]: {
        fontSize: responsiveFontSize(size),
      },
    });
  }, {} as FontSizes);
};

export enum fontWeight {
  regular = 'SF-Pro-Regular',
  medium = 'SF-Pro-Medium',
  semibold = 'SF-Pro-Semibold',
  bold = 'SF-Pro-Bold',
}

export const staticFontStyles = {
  alignLeft: {
    textAlign: 'left',
  },
  alignCenter: {
    textAlign: 'center',
  },
  bold: {
    fontFamily: fontWeight.bold,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
  uppercase: {
    textTransform: 'uppercase',
  },
  italic: {
    fontStyle: 'italic',
  },
  underline: {
    textDecorationLine: 'underline',
  },
} as const satisfies Record<string, TextStyle>;
