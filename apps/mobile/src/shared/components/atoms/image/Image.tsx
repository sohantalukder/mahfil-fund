import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp, DimensionValue } from 'react-native';
import FastImage, { ResizeMode, FastImageProps } from '@d11/react-native-fast-image';
import PlaceholderImage from '@/assets/icons/Placeholder.icon';
import isEmpty from '@/shared/utilities/isEmpty';
import Skeleton from '@/shared/components/atoms/skeleton/Skeleton';

export type ImageSource = { uri?: string; require?: number } | number;

type Properties = FastImageProps & {
  source: ImageSource;
  borderRadius?: number;
  resizeMode?: ResizeMode;
  cacheControl?: 'immutable' | 'web' | 'cacheOnly';
  priority?: 'low' | 'normal' | 'high';
  height?: DimensionValue;
  width?: DimensionValue;
  wrapperStyle?: StyleProp<ViewStyle>;
};

const Image: React.FC<Properties> = ({
  source,
  resizeMode = 'cover',
  borderRadius = 0,
  cacheControl = 'immutable',
  priority = 'normal',
  height,
  width,
  wrapperStyle,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const processedSource = useMemo(() => {
    if (typeof source === 'number') {
      return source;
    }

    const imageCopy = { ...source };

    if (!isEmpty(imageCopy) && !isEmpty(imageCopy.uri)) {
      try {
        if (
          typeof imageCopy.uri === 'string' &&
          (imageCopy.uri.startsWith('{') || imageCopy.uri.startsWith('['))
        ) {
          imageCopy.uri = JSON.parse(imageCopy.uri);
        }
      } catch (e) {
        console.error('ImagePreview: failed to parse URI', e);
      }
    }

    return imageCopy;
  }, [source]);

  const hasValidSource = useMemo(() => {
    if (typeof processedSource === 'number') return true;
    return !isEmpty(processedSource?.uri);
  }, [processedSource]);

  const handleLoadStart = useCallback(() =>setIsLoading(true), []);
  const handleLoadEnd = useCallback(() => setIsLoading(false), []);

  const handleError = useCallback(() => setIsLoading(false), []);
  
  const fastImageSource = useMemo<Exclude<FastImageProps['source'], undefined>>(() => {
    if (typeof processedSource === 'number') {
      setIsLoading(false);
      return processedSource;
    }

    if (processedSource?.uri) {
      return {
        ...processedSource,
        priority: FastImage.priority[priority],
        cache: FastImage.cacheControl[cacheControl],
      };
    }

    return processedSource as Exclude<FastImageProps['source'], undefined>;
  }, [processedSource, priority, cacheControl]);

  const renderImage = () => {
    if (isLoading) {
      return (
        <View style={[wrapperStyle, styles.loaderContainer, { borderRadius, height, width }]}>
          <Skeleton
            height="100%"
            width="100%"
            borderRadius={borderRadius}
          />
        </View>
      );
    }

    if (hasValidSource) {
      return (
        <View style={[wrapperStyle, { height, width }]}>
          <FastImage
            source={fastImageSource}
            style={[styles.image, { height, width, borderRadius }]}
            resizeMode={resizeMode}
            onLoadStart={()=>{if(typeof source !=='number')handleLoadStart()}}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
            testID="image-preview"
            {...props}
          />
        </View>
      );
    }

    return (
      <PlaceholderImage
        style={[styles.image, { borderRadius, height, width }, props.style]}
      />
    );
  };

  return renderImage();
};

const styles = StyleSheet.create({
  image: {
    height: '100%',
    width: '100%',
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default React.memo(Image);
