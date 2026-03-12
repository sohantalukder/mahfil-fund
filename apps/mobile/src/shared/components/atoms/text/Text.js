import { jsx as _jsx } from "react/jsx-runtime";
import { Text as RNText } from 'react-native';
import i18next from 'i18next';
import { useTheme } from '@/theme';
import { fontFamily, fontFamilyBn, fontWeight } from '@/theme/fonts';
import withOpacity from '@/shared/utilities/withOpacity';
const Text = ({ color = 'default', variant = 'body1', weight = 'regular', style, ...props }) => {
    const { fonts, typographies } = useTheme();
    // Map color prop to actual color value
    const colorMap = {
        default: fonts.text.color,
        primary: fonts.primary.color,
        secondary: fonts.gray1.color,
        success: fonts.success.color,
        warning: fonts.warning.color,
        error: fonts.error.color,
        disabled: withOpacity(fonts.text.color, 0.5),
        black: fonts.black.color,
        white: fonts.white.color,
    };
    // Map weight prop to actual font weight value s
    const weightMap = {
        regular: fontWeight.regular,
        medium: fontWeight.medium,
        semibold: fontWeight.semibold,
        bold: fontWeight.bold,
    };
    const isBangla =
    // Prefer explicit language codes, but fall back to prefix check
    i18next.language === 'bn-BN' || i18next.language?.startsWith('bn');
    const familyForWeight = (currentWeight) => {
        const mapping = isBangla ? fontFamilyBn : fontFamily;
        switch (currentWeight) {
            case 'medium':
                return mapping.medium;
            case 'semibold':
                return mapping.semibold;
            case 'bold':
                return mapping.bold;
            case 'regular':
            default:
                return mapping.regular;
        }
    };
    // Map variant prop to actual typography style
    const variantStyle = typographies[variant] || typographies.body1;
    return (_jsx(RNText, { style: [
            variantStyle,
            { color: colorMap[color] },
            { fontWeight: weightMap[weight] },
            { fontFamily: familyForWeight(weight) },
            style,
        ], ...props }));
};
export default Text;
