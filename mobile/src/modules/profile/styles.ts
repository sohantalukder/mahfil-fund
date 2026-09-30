import { StyleSheet } from 'react-native';
import type { Colors } from '@/theme/types/colors';

// Use theme tokens only — no hardcoded brand colors
export const getStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 48,
    },

    // ── Header ──────────────────────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.gray8,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // ── Banner ───────────────────────────────────────────────────────────────
    banner: {
      paddingVertical: 36,
      paddingHorizontal: 20,
      paddingBottom: 28,
      alignItems: 'center',
      overflow: 'hidden',
    },
    bannerBg: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.primary,
    },
    bannerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.warning,
      opacity: 0.12,
    },

    // ── Avatar ───────────────────────────────────────────────────────────────
    avatarRingWrapper: {
      position: 'relative',
      marginBottom: 14,
    },
    avatarRing: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 3,
      borderColor: colors.warning,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.gray8,
      overflow: 'hidden',
    },
    avatarInitialsCircle: {
      width: 94,
      height: 94,
      borderRadius: 47,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarImage: {
      width: 94,
      height: 94,
      borderRadius: 47,
    },
    avatarInitials: {
      color: colors.white,
    },
    editPencil: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.warning,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },

    // ── Profile text ─────────────────────────────────────────────────────────
    nameText: {
      color: colors.white,
      textAlign: 'center',
      marginBottom: 4,
    },
    roleText: {
      color: colors.warning,
      textAlign: 'center',
      marginBottom: 8,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    locationText: {
      color: 'rgba(255,255,255,0.6)',
    },

    // ── Stats row ────────────────────────────────────────────────────────────
    statsRow: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginVertical: 16,
      borderRadius: 14,
      backgroundColor: colors.gray9,
      borderWidth: 1,
      borderColor: colors.gray8,
      overflow: 'hidden',
    },
    statCol: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 16,
    },
    statColBorder: {
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.gray8,
    },

    // ── Section card ─────────────────────────────────────────────────────────
    sectionWrapper: {
      marginHorizontal: 16,
      marginBottom: 16,
    },
    sectionLabel: {
      color: colors.gray4,
      marginBottom: 8,
    },
    sectionCard: {
      backgroundColor: colors.gray9,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.gray8,
    },

    // ── Profile row ──────────────────────────────────────────────────────────
    profileRow: {
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

    // ── Colors ──────────────────────────────────────────────────────────────
    errorText: {
      color: colors.error,
    },

    // ── Edit Profile Sheet ───────────────────────────────────────────────────
    sheetPadding: {
      paddingHorizontal: 24,
      paddingBottom: 32,
    },
    sheetTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 6,
      paddingTop: 4,
    },
    sheetTitleIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Empty activity ───────────────────────────────────────────────────────
    emptyActivity: {
      paddingVertical: 32,
      alignItems: 'center',
    },
  });
