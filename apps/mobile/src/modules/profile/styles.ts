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
      paddingBottom: 48,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.gray9,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Banner
    banner: {
      paddingVertical: 32,
      paddingHorizontal: 20,
      alignItems: 'center',
      overflow: 'hidden',
    },
    bannerBg: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: LOGO_BG,
    },
    bannerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: GOLD,
      opacity: 0.18,
    },

    // Avatar Ring
    avatarRingWrapper: {
      position: 'relative',
      marginBottom: 16,
    },
    avatarRing: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 3,
      borderColor: GOLD,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.gray8,
      overflow: 'hidden',
    },
    avatarInitialsCircle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: LOGO_BG,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitials: {
      color: colors.white,
    },
    editPencil: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: GOLD,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.white,
    },

    // Profile text
    nameText: {
      color: colors.white,
      textAlign: 'center',
      marginBottom: 4,
    },
    roleText: {
      color: GOLD,
      textAlign: 'center',
      marginBottom: 8,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    locationText: {
      color: colors.gray3,
    },

    // Stats row
    statsRow: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginVertical: 16,
      borderRadius: 12,
      backgroundColor: colors.white,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
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

    // Section card
    sectionWrapper: {
      marginHorizontal: 16,
      marginBottom: 16,
    },
    sectionLabel: {
      color: colors.gray4,
      marginBottom: 8,
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

    // Profile row
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
      backgroundColor: colors.gray9,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rowText: {
      flex: 1,
    },

    // Colors
    errorText: {
      color: colors.error,
    },
    goldText: {
      color: GOLD,
    },
    whiteText: {
      color: colors.white,
    },
  });
