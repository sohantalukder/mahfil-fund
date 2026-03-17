import React, { useEffect } from 'react';
import type { StyleProp, ViewStyle, ColorValue } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { IconByVariant } from '@/shared/components/atoms';

const DURATION_MS = 900;

/**
 * Properties for the Loader component.
 */
type Properties = {
  /**
   * The style of the loader.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * The color of the loader.
   */
  color?: ColorValue;
};

const Loader: React.FC<Properties> = ({ style, color }) => {
  const { layout, colors } = useTheme();

  const rotate = useSharedValue(0);

  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(1, { duration: DURATION_MS, easing: Easing.linear }),
      -1,
      false
    );
    return () => {
      cancelAnimation(rotate);
    };
  }, [rotate]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotate.value * 360}deg` }],
    };
  }, []);

  return (
    <Animated.View
      testID="loader"
      style={[layout.alignSelf, animatedStyle, style]}
    >
      <IconByVariant
        path="loader"
        color={color ?? colors.text}
      />
    </Animated.View>
  );
};

export default Loader;
