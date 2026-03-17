import { StyleSheet } from 'react-native';
import type { Colors } from '@/theme/types/colors';

const LOGO_BG = '#1A5C30';
const GOLD = '#E8A800';

export const getStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 48,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
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

    // Success bar
    successBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#E8F5E9',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 16,
      gap: 8,
    },
    successText: {
      flex: 1,
      color: '#1A5C30',
    },
    successClose: {
      padding: 4,
    },

    // Section
    sectionTitle: {
      color: colors.gray4,
      letterSpacing: 0.8,
      marginBottom: 8,
      marginTop: 20,
    },
    sectionCard: {
      backgroundColor: colors.white,
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },

    // Row
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    rowIconBox: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.gray9,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rowIconBoxGold: {
      backgroundColor: '#FFF8E1',
    },
    rowText: {
      flex: 1,
    },
    rowRight: {
      alignItems: 'flex-end',
    },

    // Language toggle
    langToggle: {
      flexDirection: 'row',
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.gray7,
    },
    langBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    langBtnActive: {
      backgroundColor: LOGO_BG,
    },
    langBtnInactive: {
      backgroundColor: colors.transparent,
    },
    langTextActive: {
      color: colors.white,
    },
    langTextInactive: {
      color: colors.text,
    },

    // Cloud Sync
    cloudSyncRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    cloudSyncContent: {
      flex: 1,
    },
    cloudSyncStatus: {
      color: LOGO_BG,
    },
    cloudSyncMeta: {
      color: colors.gray4,
    },
    syncBtn: {
      borderColor: colors.gray7,
    },

    // Account
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    initialsCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.gray8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    initialsText: {
      color: colors.text,
    },
    accountInfo: {
      flex: 1,
    },
    editBtn: {
      color: LOGO_BG,
    },

    // Logout
    logoutText: {
      color: colors.error,
    },

    goldText: {
      color: GOLD,
    },
  });
