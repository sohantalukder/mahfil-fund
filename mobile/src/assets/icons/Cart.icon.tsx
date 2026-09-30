import { useTheme } from '@/theme';
import type { IconProps } from '@/types/iconProps';
import React from 'react';
import Svg, { Path } from 'react-native-svg';

const CartIcon: React.FC<IconProps> = ({ height = 24, width = 24, fill }) => {
  const { colors } = useTheme();
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24">
      <Path
        fill={fill ?? colors.text}
        d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zm-8.9-5h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4H5.21l-.94-2H1v2h2l3.6 8.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7.42l1.68-3.03z"
      />
    </Svg>
  );
};

export default CartIcon;
