import { StyleSheet } from 'react-native';
import type { Colors } from '@/theme/types/colors';

// All theme-token based — no hardcoded brand colors
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

    // ── Header ──────────────────────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.gray8,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // ── Success bar ──────────────────────────────────────────────────────────
    successBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success + '18',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 16,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.success + '30',
    },
    successText: {
      flex: 1,
      color: colors.success,
    },
    successClose: {
      padding: 4,
    },

    // ── Section ──────────────────────────────────────────────────────────────
    sectionTitle: {
      color: colors.gray4,
      letterSpacing: 0.8,
      marginBottom: 8,
      marginTop: 20,
    },
    sectionCard: {
      backgroundColor: colors.gray9,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.gray8,
    },

    // ── Row ──────────────────────────────────────────────────────────────────
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
      backgroundColor: colors.gray8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rowText: {
      flex: 1,
    },
    rowRight: {
      alignItems: 'flex-end',
    },

    // ── Language toggle ──────────────────────────────────────────────────────
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
      backgroundColor: colors.primary,
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

    // ── Cloud Sync ───────────────────────────────────────────────────────────
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
      color: colors.success,
    },
    cloudSyncMeta: {
      color: colors.gray4,
    },

    // ── Account row ──────────────────────────────────────────────────────────
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
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    initialsText: {
      color: colors.white,
    },
    accountInfo: {
      flex: 1,
    },
    editBtn: {
      color: colors.primary,
    },

    // ── Logout ───────────────────────────────────────────────────────────────
    logoutText: {
      color: colors.error,
    },
  });
