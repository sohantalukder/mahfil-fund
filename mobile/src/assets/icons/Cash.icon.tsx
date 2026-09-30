import { useTheme } from '@/theme';
import type { IconProps } from '@/types/iconProps';
import React from 'react';
import Svg, { Path } from 'react-native-svg';

const CashIcon: React.FC<IconProps> = ({ height = 24, width = 24, fill }) => {
  const { colors } = useTheme();
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24">
      <Path
        fill={fill ?? colors.text}
        d="M2 6c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6zm18 0H4v12h16V6zm-9 2a3 3 0 110 6 3 3 0 010-6zm0 1.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM5 9H4v2h1V9zm14 0h-1v2h1V9zM5 14H4v1h1v-1zm14 0h-1v1h1v-1z"
      />
    </Svg>
  );
};

export default CashIcon;
