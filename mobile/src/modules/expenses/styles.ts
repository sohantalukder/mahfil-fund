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
      paddingHorizontal: 20,
      paddingBottom: 48,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.gray9,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headingSection: {
      paddingBottom: 24,
    },
    headingTitle: {
      color: LOGO_BG,
      marginBottom: 4,
    },
    categoryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    chipSelected: {
      backgroundColor: LOGO_BG,
      borderColor: LOGO_BG,
    },
    chipUnselected: {
      backgroundColor: colors.transparent,
      borderColor: colors.gray7,
    },
    chipTextSelected: {
      color: colors.white,
    },
    chipTextUnselected: {
      color: colors.text,
    },
    amountAddon: {
      paddingRight: 4,
      justifyContent: 'center',
    },
    saveBtn: {
      marginTop: 24,
      backgroundColor: LOGO_BG,
    },
    saveBtnIcon: {
      marginRight: 8,
    },
    fieldLabel: {
      marginBottom: 8,
      marginTop: 16,
    },
    goldColor: {
      color: GOLD,
    },
  });
