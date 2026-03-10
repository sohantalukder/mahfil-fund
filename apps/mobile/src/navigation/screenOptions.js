import { Platform } from 'react-native';
const baseOptions = {
    headerShown: false,
    cardOverlayEnabled: true,
};
const androidOptions = {
    ...baseOptions,
    cardStyle: { backgroundColor: 'transparent' },
    cardStyleInterpolator: ({ current: { progress } }) => ({
        cardStyle: {
            opacity: progress,
        },
    }),
    transitionSpec: {
        open: {
            animation: 'spring',
            config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: true,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
            },
        },
        close: {
            animation: 'spring',
            config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: true,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
            },
        },
    },
};
const iosOptions = {
    ...baseOptions,
    // iOS uses default animations - no custom properties needed
};
const screenOptions = Platform.OS === 'ios' ? iosOptions : androidOptions;
export { screenOptions };
