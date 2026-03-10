import { jsx as _jsx } from "react/jsx-runtime";
import { useTheme } from '@/theme';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming, } from 'react-native-reanimated';
const config = {
    size: 24,
    dotSize: 8,
};
const Radio = ({ checked = false, disabled = false, onChange, }) => {
    const { colors } = useTheme();
    const scale = useSharedValue(1);
    const appearance = useSharedValue(0);
    const [isChecked, setIsChecked] = useState(checked);
    const handlePress = () => {
        setIsChecked(!isChecked);
        onChange?.(!isChecked);
    };
    useEffect(() => {
        scale.value = withSequence(withTiming(0.9, { duration: 100, easing: Easing.bounce }), withTiming(1, { duration: 100 }));
        appearance.value = withDelay(30, withTiming(isChecked ? 1 : 0, { duration: 200 }));
    }, [isChecked, scale, appearance]);
    useEffect(() => {
        setIsChecked(checked);
    }, [checked]);
    const containerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        backgroundColor: interpolateColor(appearance.value, [0, 1], [colors.background, colors.primary]),
        borderColor: interpolateColor(appearance.value, [0, 1], [colors.primary, colors.primary]),
    }));
    const iconAnimatedStyle = useAnimatedStyle(() => ({
        opacity: appearance.value,
    }));
    return (_jsx(Pressable, { onPress: handlePress, disabled: disabled, testID: "radio", style: {
            width: config.size,
            height: config.size,
        }, children: _jsx(Animated.View, { style: [
                styles.container,
                containerAnimatedStyle,
                disabled ? styles.containerDisabled : null,
            ], children: _jsx(Animated.View, { style: [styles.icon, iconAnimatedStyle] }) }) }));
};
export default Radio;
const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        borderRadius: '100%',
        borderWidth: 1,
        height: config.size,
        justifyContent: 'center',
        width: config.size,
    },
    containerDisabled: {
        opacity: 0.5,
    },
    icon: {
        height: config.dotSize,
        width: config.dotSize,
    },
});
