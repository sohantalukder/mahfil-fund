import { jsx as _jsx } from "react/jsx-runtime";
import { Ripple, Text } from '@/shared/components/atoms';
import { useTheme } from '@/theme';
import { View } from 'react-native';
const ClickableText = ({ onPress = () => { }, style, textColor = 'default', variant = 'body3', textStyle, children, }) => {
    const { layout, gutters } = useTheme();
    return (_jsx(Ripple, { onPress: onPress, children: _jsx(View, { style: [layout.itemsCenter, gutters.padding_4, style], children: _jsx(Text, { variant: variant, color: textColor, weight: "semibold", style: textStyle, children: children }) }) }));
};
export default ClickableText;
