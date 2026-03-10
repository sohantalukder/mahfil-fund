import { fontFamily, fontWeight } from '@/theme/fonts';
import { Platform } from 'react-native';
export const screenOptions = ({ colors, }) => {
    return {
        swipeEnabled: true,
        tabBarLabelStyle: {
            fontFamily: fontFamily.medium,
            fontWeight: fontWeight.medium,
            textTransform: 'none',
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.gray4,
        tabBarStyle: {
            borderBottomWidth: Platform.OS === 'ios' ? 1 : 0,
            borderBottomColor: colors.gray8,
        },
        tabBarIndicatorStyle: {
            backgroundColor: colors.primary,
        },
    };
};
