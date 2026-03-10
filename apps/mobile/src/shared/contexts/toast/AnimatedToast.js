import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useRef } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { clamp, Easing, measure, runOnJS, useAnimatedRef, useAnimatedStyle, useSharedValue, withSpring, withTiming, } from 'react-native-reanimated';
import { Toast } from '../../components/atoms';
const ANIMATION_CONFIG = {
    duration: 300,
    easing: Easing.out(Easing.cubic),
};
const SPRING_CONFIG = {
    damping: 15,
    stiffness: 150,
    mass: 1,
};
export const AnimatedToast = ({ toast, hide }) => {
    const containerRef = useAnimatedRef();
    const timeoutRef = useRef(null);
    // Animation values
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(-100);
    const scale = useSharedValue(0.8);
    const gestureTranslateY = useSharedValue(0);
    // Optimized dismiss handler
    const onDismiss = useCallback(() => {
        // Clear timeout if manually dismissed
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        // Exit animation
        opacity.value = withTiming(0, ANIMATION_CONFIG);
        translateY.value = withTiming(-100, ANIMATION_CONFIG);
        scale.value = withTiming(0.8, ANIMATION_CONFIG, (finished) => {
            if (finished) {
                runOnJS(hide)();
            }
        });
    }, [hide, opacity, translateY, scale]);
    // Entrance animation
    useEffect(() => {
        // Start entrance animation
        opacity.value = withTiming(1, ANIMATION_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
        scale.value = withSpring(1, SPRING_CONFIG);
        // Set up auto-dismiss timeout
        const timeout = toast.timeout ?? 2000;
        timeoutRef.current = setTimeout(() => {
            onDismiss();
        }, timeout);
        // Cleanup function
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [toast.timeout, onDismiss, opacity, translateY, scale]);
    // Optimized pan gesture
    const pan = Gesture.Pan()
        .onChange(({ translationY }) => {
        // Only allow upward swipe (negative values)
        gestureTranslateY.value = clamp(translationY, -200, 0);
    })
        .onEnd(({ velocityY, translationY }) => {
        const bounds = measure(containerRef);
        const height = bounds?.height ?? 80; // Fallback height
        // Determine if should dismiss based on velocity and distance
        const shouldDismiss = translationY < -height / 3 || (velocityY < -500 && translationY < -20);
        if (shouldDismiss) {
            // Animate out
            gestureTranslateY.value = withTiming(-height, ANIMATION_CONFIG, () => {
                runOnJS(onDismiss)();
            });
        }
        else {
            // Snap back
            gestureTranslateY.value = withSpring(0, SPRING_CONFIG);
        }
    })
        .onFinalize(() => {
        // Reset gesture state if not dismissing
        if (gestureTranslateY.value > -50) {
            gestureTranslateY.value = withSpring(0, SPRING_CONFIG);
        }
    });
    // Optimized animated styles
    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { translateY: translateY.value + gestureTranslateY.value },
            { scale: scale.value },
        ],
    }), []);
    return (_jsx(GestureDetector, { gesture: pan, children: _jsx(Animated.View, { ref: containerRef, style: animatedStyle, children: _jsx(Toast, { type: toast.type, title: toast.title, onDismiss: onDismiss }) }) }));
};
