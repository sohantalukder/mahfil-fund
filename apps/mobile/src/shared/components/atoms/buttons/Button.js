import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { memo, useMemo } from 'react';
import { useTheme } from '@/theme';
import Loader from '../loader/Loader';
import { Ripple, Text, IconByVariant } from '@/shared/components/atoms';
import { buttonStyles } from './styles/button.styles';
import { View } from 'react-native';
const Button = memo(({ activityColor, bgColor, borderRadius = 14, disabled, icon, iconColor, iconPosition = 'left', isLoading, onPress = () => { }, rippleColor, textColor, textStyle = {}, text = '', variant = 'primary', wrapStyle, }) => {
    const { colors } = useTheme();
    // Memoize styles to prevent recalculation on re-renders
    const styles = React.useMemo(() => buttonStyles({
        borderRadius,
        colors,
        ...(bgColor && { bgColor }),
    }), [borderRadius, bgColor, colors]);
    const handlePress = React.useCallback(() => {
        if (!isLoading) {
            onPress();
        }
    }, [isLoading, onPress]);
    const renderButton = () => (_jsxs(View, { style: styles.iconGap, children: [iconPosition === 'left' && typeof icon === 'string' ? (_jsx(IconByVariant, { path: icon, ...(iconColor && { color: iconColor }) })) : (icon), text ? (_jsx(Text, { numberOfLines: 1, variant: "body1", weight: "medium", style: [
                    {
                        color: textColor ?? styles[variant].color ?? colors.text,
                    },
                    textStyle,
                ], children: text })) : null, iconPosition === 'right' &&
                (typeof icon === 'string' ? (_jsx(IconByVariant, { path: icon, ...(iconColor && { color: iconColor }) })) : (icon))] }));
    const loaderColor = useMemo(() => {
        const color = {
            outline: colors.text,
            primary: colors.white,
            secondary: colors.white,
            success: colors.white,
            danger: colors.white,
            warning: colors.white,
            info: colors.white,
        };
        if (isLoading) {
            return activityColor ?? color[variant];
        }
        return color[variant];
    }, [isLoading, activityColor, colors.white, colors.text, variant]);
    const buttonContent = (_jsx(Ripple, { borderRadius: borderRadius, disabled: disabled || isLoading || false, onPress: () => handlePress(), ...(rippleColor && { rippleColor }), children: _jsx(View, { style: [styles.container, styles[variant] ?? {}, wrapStyle], children: isLoading ? _jsx(Loader, { color: loaderColor }) : renderButton() }) }));
    return buttonContent;
});
export default Button;
