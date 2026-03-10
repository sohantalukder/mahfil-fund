import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import { View, Platform, StatusBar as RNStatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
export var StatusBarStyle;
(function (StatusBarStyle) {
    StatusBarStyle["LIGHT"] = "light-content";
    StatusBarStyle["DARK"] = "dark-content";
})(StatusBarStyle || (StatusBarStyle = {}));
const StatusBar = memo(({ barStyle = StatusBarStyle.LIGHT, showHeader = true, bgColor, extraHeight = 0, animated = true, translucent = true, }) => {
    const { colors } = useTheme();
    const { top } = useSafeAreaInsets();
    // Use the background color from props or transparent from theme
    const backgroundColor = bgColor ?? colors.transparent;
    // Only create the styles when needed
    const containerStyle = showHeader
        ? {
            backgroundColor,
            paddingBottom: top + extraHeight,
        }
        : undefined;
    const statusBarProps = {
        barStyle,
        animated,
        ...(Platform.OS === 'android' && {
            translucent,
            backgroundColor: showHeader ? backgroundColor : colors.transparent,
        }),
    };
    if (!showHeader) {
        return _jsx(RNStatusBar, { ...statusBarProps });
    }
    return (_jsx(View, { style: containerStyle, children: _jsx(RNStatusBar, { ...statusBarProps }) }));
});
export default StatusBar;
