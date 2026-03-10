import { jsx as _jsx } from "react/jsx-runtime";
import { StyleSheet, View, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import rs from '@/shared/utilities/responsiveSize';
const Card = ({ children, style, variant = 'default', borderRadius = 12, elevation = 2, shadow = true, padding = 16, margin = 0, backgroundColor, borderColor, borderWidth = 1, width, height, pressable = false, onPress, testID, ...props }) => {
    const { colors } = useTheme();
    const styles = createStyles(colors, {
        variant,
        borderRadius,
        elevation,
        shadow,
        padding,
        margin,
        backgroundColor,
        borderColor,
        borderWidth,
        width,
        height,
    });
    const cardStyle = [
        styles.card,
        styles[variant],
        shadow && styles.shadow,
        StyleSheet.flatten(style),
    ];
    if (pressable && onPress) {
        return (_jsx(Pressable, { style: cardStyle, onPress: onPress, testID: testID, ...props, children: children }));
    }
    return (_jsx(View, { style: cardStyle, testID: testID, ...props, children: children }));
};
const createStyles = (colors, options) => {
    const { borderRadius, elevation, padding, margin, backgroundColor, borderColor, borderWidth, width, height, } = options;
    // Elevation to shadow mapping
    const elevationShadows = {
        0: {},
        1: {
            shadowColor: colors.text,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 1,
            elevation: 1,
        },
        2: {
            shadowColor: colors.text,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 2,
        },
        3: {
            shadowColor: colors.text,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 3,
        },
        4: {
            shadowColor: colors.text,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
        },
        5: {
            shadowColor: colors.text,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 5,
        },
    };
    return StyleSheet.create({
        card: {
            borderRadius: rs(borderRadius),
            height,
            margin: rs(margin),
            overflow: 'hidden',
            padding: rs(padding),
            width,
        },
        default: {
            backgroundColor: backgroundColor || colors.background,
        },
        elevated: {
            backgroundColor: backgroundColor || colors.background,
        },
        filled: {
            backgroundColor: backgroundColor || colors.gray9,
        },
        outlined: {
            backgroundColor: backgroundColor || colors.background,
            borderColor: borderColor || colors.gray7,
            borderWidth: rs(borderWidth),
        },
        shadow: elevationShadows[elevation],
    });
};
export default Card;
