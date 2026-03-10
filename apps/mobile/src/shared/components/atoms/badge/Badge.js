import { jsx as _jsx } from "react/jsx-runtime";
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Ripple, Text } from '@/shared/components/atoms';
import { staticFontStyles } from '@/theme/fonts';
const Badge = ({ text, size = 'medium', style, textStyle, textColor, bgColor, onPress = () => { }, disabled = false, }) => {
    const { colors, gutters, borders } = useTheme();
    const paddingHorizontal = {
        small: gutters.paddingHorizontal_12,
        medium: gutters.paddingHorizontal_16,
        large: gutters.paddingHorizontal_20,
    };
    const paddingVertical = {
        small: gutters.paddingVertical_4,
        medium: gutters.paddingVertical_6,
        large: gutters.paddingVertical_8,
    };
    return (_jsx(Ripple, { onPress: onPress, disabled: disabled, borderRadius: 16, children: _jsx(View, { style: [
                {
                    backgroundColor: bgColor ?? colors.transparent,
                    borderColor: colors.primary,
                },
                borders.rounded_16,
                borders.w_1,
                paddingHorizontal[size],
                paddingVertical[size],
                style,
            ], children: _jsx(Text, { variant: "body3", color: "secondary", weight: "medium", style: [
                    {
                        color: textColor
                            ? textColor
                            : bgColor
                                ? colors.white
                                : colors.text,
                    },
                    staticFontStyles.alignCenter,
                    textStyle,
                ], children: text }) }) }));
};
export default Badge;
