import { jsx as _jsx } from "react/jsx-runtime";
import { memo, useCallback, useRef } from 'react';
import { View } from 'react-native';
import { contextMenu } from './contextMenuManager';
import { IconButton, Ripple } from '@/shared/components/atoms';
import rs from '@/shared/utilities/responsiveSize';
import { useTheme } from '@/theme';
/**
 * ContextMenuButton - Pre-styled button component for triggering context menus
 *
 * Features:
 * - Default three-dots icon
 * - Consistent styling with theme
 * - Smart positioning relative to button
 * - Configurable icon and colors
 * - Accessibility support
 */
const ContextMenuButton = memo(({ menuConfig, items = [], sections = [], icon = 'more', // Default three dots icon
iconSize = 20, size = 'medium', iconColor, disabled = false, onPress, iconStyle, }) => {
    const buttonRef = useRef(null);
    const { colors } = useTheme();
    const handlePress = useCallback(() => {
        if (disabled)
            return;
        // Measure the button component to get its position
        buttonRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
            const maxWidth = menuConfig?.maxWidth ?? 200;
            const config = {
                ...menuConfig,
                items: menuConfig?.items ?? items,
                sections: menuConfig?.sections ?? sections,
                position: {
                    x: pageX, // Start from button's left edge, will be adjusted by AnimatedContextMenu
                    y: pageY + height - 10, // Let AnimatedContextMenu handle the overlap positioning
                },
                triggerBounds: {
                    x: pageX,
                    y: rs('hf') / 1.5 < pageY ? pageY : pageY - height - 10,
                    width,
                    height,
                },
                maxWidth,
            };
            contextMenu.show(config);
        });
        onPress?.();
    }, [disabled, menuConfig, items, sections, onPress]);
    return (_jsx(View, { ref: buttonRef, children: typeof icon === 'string' ? (_jsx(IconButton, { icon: icon, iconSize: iconSize, size: size, iconColor: iconColor ?? colors.text, onPress: handlePress ?? (() => { }), disabled: disabled, style: iconStyle })) : (_jsx(Ripple, { onPress: handlePress, children: _jsx(View, { children: icon }) })) }));
});
ContextMenuButton.displayName = 'ContextMenuButton';
export default ContextMenuButton;
