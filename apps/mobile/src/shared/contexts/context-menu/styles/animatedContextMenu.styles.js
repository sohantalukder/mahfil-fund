import { StyleSheet, Dimensions } from 'react-native';
import rs from '@/shared/utilities/responsiveSize';
import withOpacity from '@/shared/utilities/withOpacity';
const { height: screenHeight } = Dimensions.get('window');
export const createAnimatedContextMenuStyles = (colors) => StyleSheet.create({
    backdrop: {
        flex: 1,
    },
    container: {
        borderRadius: rs(12),
        elevation: 8,
        maxHeight: screenHeight * 0.7,
        shadowColor: colors.text,
        shadowOffset: {
            width: 0,
            height: rs(4),
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    header: {
        paddingBottom: rs(8),
        paddingHorizontal: rs(16),
        paddingTop: rs(16),
    },
    headerSubtitle: {
        marginTop: rs(2),
    },
    headerTitle: {
        fontWeight: '600',
    },
    menuItem: {
        paddingHorizontal: rs(16),
        paddingVertical: rs(12),
    },
    menuItemContent: {
        gap: rs(12),
    },
    menuItemText: {
        flex: 1,
    },
    scrollView: {
    // No additional styles needed for ScrollView
    },
    sectionTitle: {
        paddingHorizontal: rs(16),
        paddingTop: rs(12),
        paddingVertical: rs(8),
    },
    sectionTitleText: {
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    separator: {
        backgroundColor: withOpacity(colors.text, 0.1),
        height: 1,
        marginHorizontal: rs(16),
    },
});
// Helper functions for dynamic styles
export const getMenuItemPressedStyle = (colors, pressed) => ({
    backgroundColor: pressed ? withOpacity(colors.text, 0.05) : 'transparent',
});
export const getMenuItemDisabledStyle = (disabled) => ({
    opacity: disabled ? 0.5 : 1,
});
export const getHeaderTitleStyle = (colors) => ({
    color: colors.text,
});
export const getHeaderSubtitleStyle = (colors) => ({
    color: withOpacity(colors.text, 0.7),
});
export const getSectionTitleTextStyle = (colors) => ({
    color: withOpacity(colors.text, 0.6),
});
export const getMenuItemTextStyle = (colors, destructive) => ({
    color: destructive ? colors.error : colors.text,
});
export const getIconColor = (colors, item) => {
    return item.iconColor ?? (item.destructive ? colors.error : colors.text);
};
