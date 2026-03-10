import { jsx as _jsx } from "react/jsx-runtime";
import { memo, useCallback, useRef } from 'react';
import { Pressable, } from 'react-native';
import { contextMenu } from './contextMenuManager';
/**
 * ContextMenuTrigger - Component that triggers context menu on press/long press
 *
 * Features:
 * - Configurable trigger methods (press, long press, both)
 * - Smart positioning relative to trigger (above/below)
 * - Custom styling support
 * - Accessibility support
 */
const ContextMenuTrigger = memo(({ children, menuConfig, items = [], sections = [], triggerOn = 'longPress', disabled = false, style, onPress, onLongPress, ...pressableProps }) => {
    const triggerRef = useRef(null);
    const handleShowMenu = useCallback(() => {
        if (disabled)
            return;
        // Measure the trigger component to get its position
        triggerRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
            const config = {
                ...menuConfig,
                items: menuConfig?.items || items,
                sections: menuConfig?.sections || sections,
                position: {
                    x: pageX,
                    y: pageY + height, // Position below the trigger by default
                },
                // Add trigger dimensions for better positioning
                triggerBounds: {
                    x: pageX,
                    y: pageY,
                    width,
                    height,
                },
            };
            contextMenu.show(config);
        });
    }, [disabled, menuConfig, items, sections]);
    const handlePress = useCallback((_event) => {
        if (triggerOn === 'press' || triggerOn === 'both') {
            handleShowMenu();
        }
        onPress?.();
    }, [triggerOn, handleShowMenu, onPress]);
    const handleLongPress = useCallback((_event) => {
        if (triggerOn === 'longPress' || triggerOn === 'both') {
            handleShowMenu();
        }
        onLongPress?.();
    }, [triggerOn, handleShowMenu, onLongPress]);
    return (_jsx(Pressable, { ref: triggerRef, style: style, onPress: handlePress, onLongPress: handleLongPress, disabled: disabled, accessible: true, accessibilityRole: "button", accessibilityLabel: "Show context menu", accessibilityHint: "Long press to show context menu", ...pressableProps, children: children }));
});
ContextMenuTrigger.displayName = 'ContextMenuTrigger';
export default ContextMenuTrigger;
