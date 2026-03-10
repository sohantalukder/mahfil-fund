import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import { Animated, Pressable, ScrollView } from 'react-native';
import { useTheme } from '@/theme';
import { useAnimatedContextMenu } from './hooks/useAnimatedContextMenu';
import { useContextMenuRenderers } from './components/ContextMenuRenderers';
export const AnimatedContextMenu = memo(({ config, onHide }) => {
    const { colors, layout } = useTheme();
    const { fadeAnim, scaleAnim, handleBackdropPress, handleItemPress, getContainerStyle, } = useAnimatedContextMenu(config, onHide);
    const { renderHeader, renderMenuItems, renderSections } = useContextMenuRenderers({
        config,
        handleItemPress,
    });
    return (_jsx(Pressable, { style: layout.flex_1, onPress: handleBackdropPress, children: _jsx(Animated.View, { style: [
                getContainerStyle(colors),
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ], children: _jsxs(ScrollView, { showsVerticalScrollIndicator: false, children: [renderHeader(), renderMenuItems(), renderSections()] }) }) }));
});
