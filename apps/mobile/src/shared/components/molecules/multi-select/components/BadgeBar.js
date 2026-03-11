import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TouchableOpacity, View } from 'react-native';
import Text from '@/shared/components/atoms/text/Text';
import IconByVariant from '@/shared/components/atoms/icon-by-variant/IconByVariant';
import { useTheme } from '@/theme';
import { getDisplayValue } from '../utils';
import { MULTI_SELECT_LIST_CONSTANTS } from '../constants';
const BadgeBar = ({ selected, data, maxVisible = MULTI_SELECT_LIST_CONSTANTS.MAX_VISIBLE_BADGES, showAll, onToggleShowAll, onRemove, badgeBaseStyle, badgeStyles, badgeTextStyles, }) => {
    const { layout, gutters, colors } = useTheme();
    if (selected.length === 0)
        return null;
    const shouldShowMore = selected.length > maxVisible && !showAll;
    const badgesToShow = shouldShowMore
        ? selected.slice(0, maxVisible)
        : selected;
    const remaining = selected.length - maxVisible;
    return (_jsxs(View, { style: [layout.row, layout.wrap, gutters.gap_6], children: [badgesToShow.map((stored, idx) => {
                const item = data.find((d) => d.key === stored || d.value === stored);
                const label = getDisplayValue(item, stored);
                return (_jsxs(TouchableOpacity, { style: [
                        badgeBaseStyle,
                        badgeStyles,
                        layout.row,
                        layout.itemsCenter,
                    ], onPress: () => onRemove(stored), accessibilityRole: "button", accessibilityLabel: `Remove ${String(label)}`, children: [_jsx(Text, { variant: "body3", color: "default", style: badgeTextStyles, children: String(label) }), _jsx(View, { style: gutters.marginLeft_4, children: _jsx(IconByVariant, { path: "delete", width: 12, height: 12, color: colors.text }) })] }, `badge-${String(stored)}-${idx}`));
            }), shouldShowMore && (_jsx(TouchableOpacity, { style: [
                    badgeBaseStyle,
                    badgeStyles,
                    layout.row,
                    layout.itemsCenter,
                    { backgroundColor: colors.primary },
                ], onPress: () => onToggleShowAll(true), accessibilityRole: "button", accessibilityLabel: `Show ${remaining} more items`, children: _jsxs(Text, { variant: "body3", color: "white", style: badgeTextStyles, children: ["+", remaining] }) })), showAll && selected.length > maxVisible && (_jsx(TouchableOpacity, { style: [
                    badgeBaseStyle,
                    badgeStyles,
                    layout.row,
                    layout.itemsCenter,
                    { backgroundColor: colors.primary },
                ], onPress: () => onToggleShowAll(false), accessibilityRole: "button", accessibilityLabel: "Show less items", children: _jsx(Text, { variant: "body3", color: "white", style: badgeTextStyles, children: "Show less" }) }))] }));
};
export default BadgeBar;
