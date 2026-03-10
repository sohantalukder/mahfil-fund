import { jsx as _jsx } from "react/jsx-runtime";
import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import PlaceholderImage from '@/assets/icons/Placeholder.icon';
import isEmpty from '@/shared/utilities/isEmpty';
import Skeleton from '../skeleton/Skeleton';
const ImagePreview = ({ source, resizeMode = 'cover', borderRadius = 0, cache: _cache = 'immutable', priority: _priority = 'normal', height, width, wrapperStyle, style, onLoadStart, onLoadEnd, testID, ...props }) => {
    const [isLoading, setIsLoading] = useState(false);
    // Process image source only once when props change
    const processedSource = useMemo(() => {
        // Handle number case (require)
        if (typeof source === 'number') {
            return source;
        }
        // Handle object case
        const imageSource = source;
        const imageCopy = { ...imageSource };
        // Parse URI if needed
        if (!isEmpty(imageCopy) && !isEmpty(imageCopy.uri)) {
            try {
                // Only attempt to parse if the URI appears to be JSON
                if (typeof imageCopy.uri === 'string' &&
                    (imageCopy.uri.startsWith('{') || imageCopy.uri.startsWith('['))) {
                    imageCopy.uri = JSON.parse(imageCopy.uri);
                }
            }
            catch (_error) {
                if (__DEV__) {
                    console.error(_error);
                }
            }
        }
        return imageCopy;
    }, [source]);
    // Check if we have a valid image source
    const hasValidSource = useMemo(() => {
        if (typeof processedSource === 'number')
            return true;
        const sourceObj = processedSource;
        return !isEmpty(sourceObj?.uri);
    }, [processedSource]);
    // Handle image load events
    const handleLoadStart = useCallback(() => {
        setIsLoading(true);
        onLoadStart?.();
    }, [onLoadStart]);
    const handleLoadEnd = useCallback(() => {
        setIsLoading(false);
        onLoadEnd?.();
    }, [onLoadEnd]);
    // Prepare FastImage source configuration
    const fastImageSource = useMemo(() => {
        if (typeof processedSource === 'number') {
            return processedSource;
        }
        const sourceObj = processedSource;
        if (sourceObj?.uri) {
            return {
                uri: sourceObj.uri,
                priority: _priority === 'high' ? FastImage.priority.high : _priority === 'low' ? FastImage.priority.low : FastImage.priority.normal,
                cache: _cache === 'web' ? FastImage.cacheControl.web : _cache === 'cacheOnly' ? FastImage.cacheControl.cacheOnly : FastImage.cacheControl.immutable,
            };
        }
        return undefined;
    }, [processedSource, _priority, _cache]);
    return isLoading ? (_jsx(View, { style: [styles.loaderContainer, { borderRadius, height, width }], children: _jsx(Skeleton, { height: "100%", width: "100%", borderRadius: borderRadius }) })) : hasValidSource && fastImageSource ? (_jsx(View, { style: [wrapperStyle, { height, width }], children: _jsx(FastImage, { source: fastImageSource, style: [styles.image, { height, width, borderRadius }, style], resizeMode: resizeMode, onLoadStart: handleLoadStart, onLoadEnd: handleLoadEnd, testID: testID || 'image-preview', ...props }) })) : (_jsx(PlaceholderImage, { style: [styles.image, { borderRadius, height, width }, style] }));
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
export default React.memo(ImagePreview);
