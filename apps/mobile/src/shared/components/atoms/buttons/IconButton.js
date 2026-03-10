import { jsx as _jsx } from "react/jsx-runtime";
import rs from '@/shared/utilities/responsiveSize';
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Ripple, IconByVariant } from '@/shared/components/atoms';
import { iconButtonStyles } from './styles/button.styles';
const IconButton = React.memo(({ bgColor, borderRadius = rs(500), disabled, icon, onPress, style, size = 'medium', iconColor, iconSize, }) => {
    const { colors } = useTheme();
    return (_jsx(Ripple, { borderRadius: borderRadius, disabled: disabled || false, onPress: onPress || (() => { }), testID: "icon-button", children: _jsx(View, { style: [
                iconButtonStyles.container,
                iconButtonStyles[size],
                {
                    backgroundColor: bgColor ?? colors.transparent,
                    borderRadius,
                },
                style,
            ], children: typeof icon === 'string' ? (_jsx(IconByVariant, { path: icon, ...(iconColor && { color: iconColor }), ...(iconSize !== undefined && {
                    height: iconSize,
                    width: iconSize,
                }) })) : (icon) }) }));
});
export default IconButton;
