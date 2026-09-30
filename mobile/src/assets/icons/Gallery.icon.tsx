import { useTheme } from '@/theme';
import type { IconProps } from '@/types/iconProps';
import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

const GalleryIcon: React.FC<IconProps> = ({ fill, height = 24, width = 24 }) => {
  const { colors } = useTheme();
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24">
      <Rect x="2" y="2" width="20" height="20" rx="3" fill="none" stroke={fill ?? colors.text} strokeWidth="1.8" />
      <Path
        d="M2 15L7 10L10.5 13.5L14 9L22 15"
        stroke={fill ?? colors.text}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M15.5 8C15.5 8.82843 14.8284 9.5 14 9.5C13.1716 9.5 12.5 8.82843 12.5 8C12.5 7.17157 13.1716 6.5 14 6.5C14.8284 6.5 15.5 7.17157 15.5 8Z"
        fill={fill ?? colors.text}
      />
    </Svg>
  );
};

export default GalleryIcon;
