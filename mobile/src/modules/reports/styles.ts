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
      justifyContent: 'space-between',
      paddingVertical: 16,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.gray9,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerActionBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.gray9,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Filter card
    filterCard: {
      backgroundColor: colors.white,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    filterHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    filterLabel: {
      marginLeft: 8,
    },

    // Stats section
    sectionCard: {
      backgroundColor: colors.white,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    statCardInner: {
      marginBottom: 4,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    statIconBox: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statIconGold: {
      backgroundColor: '#FFF8E1',
    },
    statIconRed: {
      backgroundColor: '#FFF0EE',
    },
    statIconGreen: {
      backgroundColor: '#E8F5E9',
    },
    statAmount: {
      marginTop: 8,
      marginBottom: 4,
    },
    statTrendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    goldText: {
      color: GOLD,
    },
    greenText: {
      color: '#22C55E',
    },
    redText: {
      color: colors.error,
    },

    // Collection Growth
    chartHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    badge: {
      backgroundColor: colors.gray9,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },

    // Expense Breakdown
    breakdownSection: {
      marginTop: 4,
    },

    // Download button
    downloadBtn: {
      marginTop: 4,
      backgroundColor: LOGO_BG,
    },

    // Section divider inside stat cards
    statDivider: {
      height: 1,
      backgroundColor: colors.gray8,
      marginVertical: 12,
    },
  });
