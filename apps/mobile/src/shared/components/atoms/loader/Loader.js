import { jsx as _jsx } from "react/jsx-runtime";
import { useLayoutEffect, useMemo } from 'react';
import { useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useTheme } from '@/theme';
import { IconByVariant } from '@/shared/components/atoms';
const ANIMATION_CONFIG = {
    toValue: 1,
    duration: 1000,
    easing: Easing.linear,
    useNativeDriver: true,
};
const Loader = ({ style, color }) => {
    const spinAnim = useRef(new Animated.Value(0));
    const { layout, colors } = useTheme();
    const interpolateRotation = useMemo(() => spinAnim.current.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    }), []);
    const animatedStyle = useMemo(() => ({
        transform: [{ rotate: interpolateRotation }],
    }), [interpolateRotation]);
    useLayoutEffect(() => {
        Animated.loop(Animated.timing(spinAnim.current, ANIMATION_CONFIG)).start();
    }, []);
    return (_jsx(Animated.View, { testID: "loader", style: [layout.alignSelf, animatedStyle, style], children: _jsx(IconByVariant, { path: "loader", color: color ?? colors.text }) }));
};
export default Loader;
