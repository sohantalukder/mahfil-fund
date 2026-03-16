import { useTheme } from '@/theme';
import type { IconProps } from '@/types/iconProps';
import React from 'react';
import Svg, { Path } from 'react-native-svg';

const HomeIcon: React.FC<IconProps> = ({ height = 24, width = 24, fill }) => {
  const { colors } = useTheme();
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24">
      <Path
        fill={fill ?? colors.text}
        d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"
      />
    </Svg>
  );
};

export default HomeIcon;
