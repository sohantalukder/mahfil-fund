import { StyleSheet } from 'react-native';
import type { Colors } from '@/theme/types/colors';

const LOGO_BG = '#1A5C30';

export const getStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: colors.background,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.gray9,
      justifyContent: 'center',
      alignItems: 'center',
    },
    markAllText: {
      color: LOGO_BG,
    },

    // Notification item
    item: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.background,
      gap: 12,
    },
    itemUnread: {
      backgroundColor: colors.gray9,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconCircleDonation: {
      backgroundColor: LOGO_BG,
    },
    iconCircleDefault: {
      backgroundColor: colors.gray8,
    },
    itemContent: {
      flex: 1,
    },
    itemTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
      gap: 8,
    },
    itemTitle: {
      flex: 1,
    },
    itemTime: {
      color: colors.gray4,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: LOGO_BG,
    },
    downloadBtn: {
      marginTop: 8,
      alignSelf: 'flex-start',
      borderColor: colors.gray7,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    downloadBtnText: {
      color: colors.text,
    },

    // Section header
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.background,
    },
    sectionHeaderText: {
      color: colors.gray4,
      letterSpacing: 0.8,
    },

    // Empty state
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.gray9,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
  });
