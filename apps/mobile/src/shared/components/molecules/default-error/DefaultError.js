import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useErrorBoundary } from 'react-error-boundary';
import { TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '@/shared/components/atoms';
import { staticFontStyles } from '@/theme/fonts';
const DefaultError = ({ onReset = () => { } }) => {
    const { gutters, layout } = useTheme();
    const { resetBoundary } = useErrorBoundary();
    return (_jsxs(View, { style: [
            layout.flex_1,
            layout.justifyCenter,
            layout.itemsCenter,
            gutters.gap_16,
            gutters.padding_16,
        ], children: [_jsx(Text, { variant: "heading1", children: "Oops!" }), _jsx(Text, { variant: "body2", style: staticFontStyles.alignCenter, children: "An error occurred while loading this screen. Please try again." }), onReset ? (_jsx(TouchableOpacity, { onPress: () => {
                    resetBoundary();
                    onReset();
                }, children: _jsx(Text, { variant: "body2", style: gutters.marginTop_10, color: "error", children: "Try again" }) })) : undefined] }));
};
export default DefaultError;
