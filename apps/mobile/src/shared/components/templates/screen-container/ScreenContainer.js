import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { StatusBar } from '@/shared/components/atoms';
import { StatusBarStyle } from '@/shared/components/atoms/status-bar/StatusBar';
import { ErrorBoundary } from '@/shared/components/organisms';
/**
 * A unified screen container component that provides consistent layout, safe areas,
 * status bar handling, and optional error boundaries across the application.
 *
 * @example
 * // Basic usage
 * <ScreenContainer>
 *   <YourScreenContent />
 * </ScreenContainer>
 *
 * @example
 * // With custom settings
 * <ScreenContainer
 *   barStyle={StatusBarStyle.LIGHT}
 *   bgColor="#f0f0f0"
 *   useErrorBoundary={true}
 *   showHeader={false}
 * >
 *   <YourScreenContent />
 * </ScreenContainer>
 */
const ScreenContainer = ({ children, containerStyle, barStyle, bgColor, showHeader = true, useErrorBoundary = false, onResetError = () => { }, style, barBackgroundColor, ...props }) => {
    const { layout, navigationTheme, variant } = useTheme();
    // Determine status bar style based on theme variant if not provided
    const resolvedBarStyle = barStyle ??
        (variant === "dark" /* Variant.DARK */ ? StatusBarStyle.LIGHT : StatusBarStyle.DARK);
    // Use background color from theme if not explicitly provided
    const backgroundColor = bgColor ?? navigationTheme.colors.background;
    // Prepare content with optional error boundary
    const content = useErrorBoundary ? (_jsx(ErrorBoundary, { onReset: onResetError, children: children })) : (children);
    return (_jsxs(View, { ...props, style: [layout.flex_1, style], children: [_jsx(StatusBar, { bgColor: barBackgroundColor ?? navigationTheme.colors.background, showHeader: showHeader, barStyle: resolvedBarStyle }), _jsx(View, { style: [layout.flex_1, { backgroundColor }, containerStyle], children: content })] }));
};
export default ScreenContainer;
