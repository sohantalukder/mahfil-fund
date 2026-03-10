import { jsx as _jsx } from "react/jsx-runtime";
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
const Divider = ({ color, style, width = '100%', height = 1 }) => {
    const { colors } = useTheme();
    const styles = stylesheet(colors, width, height, color);
    return _jsx(View, { style: [styles.divider, style] });
};
export default Divider;
const stylesheet = (colors, width, height, color) => StyleSheet.create({
    divider: {
        backgroundColor: color ?? colors.gray7,
        height,
        width,
    },
});
