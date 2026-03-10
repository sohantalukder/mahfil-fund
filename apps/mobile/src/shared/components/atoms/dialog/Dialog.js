import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useMemo, useCallback } from 'react';
import { Modal, View, Pressable } from 'react-native';
import Text from '../text/Text';
import { useTheme } from '@/theme';
import IconByVariant from '../icon-by-variant/IconByVariant';
import withOpacity from '@/shared/utilities/withOpacity';
import rs from '@/shared/utilities/responsiveSize';
import Button from '../buttons/Button';
const DialogIcon = memo(({ icon, iconConfig }) => (_jsx(IconByVariant, { path: icon, ...(iconConfig?.size !== undefined && {
        width: iconConfig.size,
        height: iconConfig.size,
    }), ...(iconConfig?.color && { color: iconConfig.color }) })));
DialogIcon.displayName = 'DialogIcon';
const DialogContent = memo(({ title, description, icon, iconConfig }) => {
    const { gutters } = useTheme();
    return (_jsxs(View, { style: gutters.gap_12, children: [icon && (_jsx(DialogIcon, { icon: icon, ...(iconConfig && { iconConfig }) })), title && (_jsx(Text, { weight: "semibold", variant: "heading3", accessibilityRole: "header", children: title })), description && _jsx(Text, { color: "secondary", children: description })] }));
});
DialogContent.displayName = 'DialogContent';
const DialogButtons = memo(({ buttons }) => {
    const { layout } = useTheme();
    const buttonContainerStyle = useMemo(() => {
        if (!buttons?.length)
            return [];
        const styles = [layout.row];
        if (buttons.length === 1) {
            styles.push({ justifyContent: 'center', ...layout.flexShrink_1 });
        }
        else {
            styles.push({
                justifyContent: 'flex-end',
                gap: 12,
                ...layout.flexShrink_1,
            });
        }
        return styles;
    }, [buttons, layout]);
    if (!buttons?.length)
        return null;
    return (_jsx(View, { style: buttonContainerStyle, children: buttons.map((button, index) => (_jsx(Button, { onPress: button.onPress, text: button.label, variant: button.type || 'primary', isLoading: button.isLoading || false, wrapStyle: { height: rs(44) } }, `dialog-btn-${index}`))) }));
});
// Constants for better performance
const BACKDROP_OPACITY = 0.5;
const MIN_DIALOG_WIDTH = 280;
const DIALOG_MARGIN = 40;
// Main Dialog Component
const Dialog = memo(({ title, icon, description, buttons = [], visible = false, onDismiss, dismissible = true, iconConfig, }) => {
    const { gutters, layout, colors, borders } = useTheme();
    const styles = useMemo(() => {
        const backdropStyle = [
            layout?.flex_1,
            layout?.itemsCenter,
            layout.justifyCenter,
            {
                backgroundColor: withOpacity(colors?.gray5, BACKDROP_OPACITY),
            },
        ];
        const dialogStyle = [
            {
                backgroundColor: colors.background,
                maxWidth: rs('wf') - DIALOG_MARGIN,
                minWidth: rs(MIN_DIALOG_WIDTH),
            },
            borders.rounded_8,
            gutters.padding_20,
            gutters.gap_12,
        ];
        return { backdropStyle, dialogStyle };
    }, [layout, colors, borders, gutters]);
    const handleBackdropPress = useCallback(() => {
        if (dismissible && onDismiss) {
            onDismiss();
        }
    }, [dismissible, onDismiss]);
    const stopPropagation = useCallback((e) => {
        e.stopPropagation();
    }, []);
    // Early return for better performance
    if (!visible)
        return null;
    return (_jsx(Modal, { visible: visible, transparent: true, animationType: "fade", onRequestClose: dismissible ? onDismiss : undefined, statusBarTranslucent: true, children: _jsx(Pressable, { style: styles.backdropStyle, onPress: handleBackdropPress, accessible: true, accessibilityRole: "button", accessibilityLabel: "Close dialog", children: _jsxs(Pressable, { style: styles.dialogStyle, onPress: stopPropagation, accessible: true, accessibilityLabel: title || 'Dialog', children: [_jsx(DialogContent, { ...(title && { title }), ...(description && { description }), ...(icon && { icon }), ...(iconConfig && { iconConfig }) }), _jsx(DialogButtons, { buttons: buttons })] }) }) }));
});
export default Dialog;
