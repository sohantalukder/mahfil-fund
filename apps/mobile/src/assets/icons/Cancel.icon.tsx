import type { IconProps } from '@/types/iconProps';
import React from 'react';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

const CancelIcon: React.FC<IconProps> = ({
  fill,
  height = 24,
  width = 24,
}) => {
  const { colors } = useTheme();
  return (
    <Svg
      fill="none"
      height={height}
      viewBox="0 0 24 24"
      width={width}
    >
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={fill ?? colors.text}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
};

export default CancelIcon;
