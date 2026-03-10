import { jsx as _jsx } from "react/jsx-runtime";
import { useTheme } from '@/theme';
import { useEffect, useMemo, useRef } from 'react';
import { Animated } from 'react-native';
const Skeleton = ({ width = 50, height = 30, borderRadius = 4, bgColor, style, }) => {
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const { colors } = useTheme();
    useEffect(() => {
        const animate = () => {
            shimmerAnim.setValue(0);
            Animated.loop(Animated.timing(shimmerAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            })).start();
        };
        animate();
        return () => {
            shimmerAnim.stopAnimation();
            shimmerAnim.setValue(0);
        };
    }, [shimmerAnim]);
    const translateX = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-100, 100],
    });
    const opacity = shimmerAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.3, 0.7, 0.3],
    });
    const baseColor = bgColor || colors.gray6;
    const containerStyle = useMemo(() => ({
        height,
        width,
        backgroundColor: baseColor,
        borderRadius,
        overflow: 'hidden',
        opacity,
    }), [baseColor, borderRadius, height, width, opacity]);
    const shimmerStyle = useMemo(() => ({
        position: 'absolute',
        top: 0,
        left: '-100%',
        height: '100%',
        width: '100%',
        backgroundColor: colors.skeleton,
        transform: [
            {
                translateX,
            },
            {
                skewX: '-20deg',
            },
        ],
    }), [colors.skeleton, translateX]);
    return (_jsx(Animated.View, { testID: "skeleton", style: [containerStyle, style], children: _jsx(Animated.View, { style: shimmerStyle }) }));
};
export default Skeleton;
