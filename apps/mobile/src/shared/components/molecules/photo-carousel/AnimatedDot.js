import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, } from 'react-native-reanimated';
import { useTheme } from '@/theme';
/**
 * An animated dot component for pagination indicators
 * Uses proper Reanimated 2 patterns to avoid accessing .value in render
 */
const AnimatedDot = memo(({ index, scrollX, carouselWidth }) => {
    const { colors } = useTheme();
    // Create an animated style based on scroll position
    const animatedStyle = useAnimatedStyle(() => {
        // Calculate the input range for this specific dot
        const inputRange = [
            (index - 1) * carouselWidth,
            index * carouselWidth,
            (index + 1) * carouselWidth,
        ];
        // Interpolate opacity and scale based on scroll position
        const opacity = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], 'clamp');
        const scale = interpolate(scrollX.value, inputRange, [0.8, 1.2, 0.8], 'clamp');
        return {
            opacity,
            transform: [{ scale }],
        };
    });
    return (_jsx(Animated.View, { style: [
            styles.dot,
            { backgroundColor: colors.white, shadowColor: colors.black },
            animatedStyle,
        ], accessibilityRole: "none" }));
});
const styles = StyleSheet.create({
    dot: {
        borderRadius: 4,
        elevation: 2,
        height: 8,
        marginHorizontal: 4,
        shadowOpacity: 0.3,
        shadowRadius: 1,
        width: 8,
    },
});
export default AnimatedDot;
