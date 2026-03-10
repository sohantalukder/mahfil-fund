import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useRef, useState, useCallback, memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue, runOnJS, } from 'react-native-reanimated';
import AnimatedDot from './AnimatedDot';
import { Image } from '@/shared/components/atoms';
// Move configuration outside of component to prevent recreation
const CONFIG = {
    carouselHeight: 200,
    initialTimeout: 5000, // Auto-scroll timeout in ms
    scrollEventThrottle: 8, // Lower for smoother updates
};
/**
 * A carousel component for displaying photos with pagination dots.
 * Optimized for performance and accessibility.
 */
const PhotoCarousel = memo(({ photos, carouselHeight = CONFIG.carouselHeight, dotsStyle = {}, autoScroll = false, autoScrollInterval = CONFIG.initialTimeout, onPhotoChange, accessibilityLabel = 'Photo carousel', }) => {
    // State and refs
    const scrollX = useSharedValue(0);
    const flatListRef = useRef(null);
    const [carouselWidth, setCarouselWidth] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const autoScrollTimer = useRef(null);
    const userScrolling = useRef(false);
    // Calculate current page from scroll position
    const updateCurrentPage = useCallback((x) => {
        if (carouselWidth <= 0)
            return;
        const newIndex = Math.round(x / carouselWidth);
        if (newIndex !== currentIndex &&
            newIndex >= 0 &&
            newIndex < photos.length) {
            setCurrentIndex(newIndex);
            onPhotoChange?.(newIndex);
        }
    }, [carouselWidth, currentIndex, photos.length, onPhotoChange]);
    // Scroll handler with optimized performance
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
            runOnJS(updateCurrentPage)(event.contentOffset.x);
        },
        onBeginDrag: () => {
            userScrolling.current = true;
        },
        onEndDrag: () => {
            userScrolling.current = false;
        },
    });
    // Handle auto-scrolling
    React.useEffect(() => {
        if (!autoScroll || photos.length <= 1)
            return;
        const startAutoScroll = () => {
            autoScrollTimer.current = setInterval(() => {
                if (userScrolling.current || !flatListRef.current)
                    return;
                const nextIndex = (currentIndex + 1) % photos.length;
                flatListRef.current.scrollToIndex({
                    index: nextIndex,
                    animated: true,
                });
            }, autoScrollInterval);
        };
        startAutoScroll();
        return () => {
            if (autoScrollTimer.current) {
                clearInterval(autoScrollTimer.current);
            }
        };
    }, [autoScroll, autoScrollInterval, currentIndex, photos.length]);
    // Memoized photo rendering function
    const renderPhoto = useCallback(({ item, index }) => (_jsx(View, { accessibilityRole: "image", accessible: true, accessibilityLabel: item.accessibilityLabel || `Photo ${index + 1} of ${photos.length}`, children: _jsx(Image, { source: { uri: item.uri }, style: { width: carouselWidth, height: carouselHeight }, resizeMode: "cover" }) })), [carouselWidth, carouselHeight, photos.length]);
    // Memoized key extractor
    const keyExtractor = useCallback((item) => item.id, []);
    // Handle layout measurement - only needed once per width change
    const onLayout = useCallback((event) => {
        const { width } = event.nativeEvent.layout;
        if (width !== carouselWidth) {
            setCarouselWidth(width);
        }
    }, [carouselWidth]);
    // Handle empty state
    if (photos.length === 0) {
        return _jsx(View, {});
    }
    return (_jsx(View, { style: styles.container, onLayout: onLayout, accessibilityLabel: accessibilityLabel, accessibilityHint: `Contains ${photos.length} photos. Swipe to navigate.`, children: carouselWidth > 0 && (_jsxs(View, { style: [
                styles.carouselContainer,
                { width: carouselWidth, height: carouselHeight },
            ], children: [_jsx(Animated.FlatList, { ref: flatListRef, data: photos, renderItem: renderPhoto, keyExtractor: keyExtractor, horizontal: true, pagingEnabled: true, showsHorizontalScrollIndicator: false, onScroll: scrollHandler, scrollEventThrottle: CONFIG.scrollEventThrottle, initialNumToRender: 1, maxToRenderPerBatch: 2, windowSize: 3, removeClippedSubviews: true, getItemLayout: (_, index) => ({
                        length: carouselWidth,
                        offset: carouselWidth * index,
                        index,
                    }) }), photos.length > 1 && (_jsx(View, { style: [styles.dotsContainer, StyleSheet.flatten(dotsStyle)], accessibilityLabel: `Page ${currentIndex + 1} of ${photos.length}`, children: photos.map((_, index) => (_jsx(AnimatedDot, { index: index, scrollX: scrollX, carouselWidth: carouselWidth }, index))) }))] })) }));
});
const styles = StyleSheet.create({
    carouselContainer: {
        borderRadius: 8,
        overflow: 'hidden', // Add rounded corners
    },
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    dotsContainer: {
        bottom: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        left: 0,
        paddingVertical: 8,
        position: 'absolute',
        right: 0,
    },
});
export default PhotoCarousel;
