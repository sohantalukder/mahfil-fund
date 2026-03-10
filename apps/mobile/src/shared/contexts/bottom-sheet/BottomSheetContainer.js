import { jsx as _jsx } from "react/jsx-runtime";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import RNBottomSheet, { BottomSheetBackdrop, BottomSheetView, } from '@gorhom/bottom-sheet';
import { BackHandler, StyleSheet, TouchableWithoutFeedback, } from 'react-native';
import { bottomSheet, DEFAULT_OPTIONS } from './manager';
import { DEFAULT_SNAP_POINTS } from './types';
import { useTheme } from '@/theme';
const BottomSheetContainer = () => {
    const sheetRef = useRef(null);
    const { colors } = useTheme();
    const [state, setState] = useState({
        isOpen: false,
        snapIndex: -1,
        component: null,
        props: {},
        options: DEFAULT_OPTIONS,
    });
    const backHandler = useCallback(() => {
        return BackHandler.addEventListener('hardwareBackPress', () => {
            if (bottomSheet.isOpen()) {
                bottomSheet.close();
                return true;
            }
            return false;
        });
    }, [state.snapIndex]);
    useEffect(() => {
        backHandler();
        // Set ref using requestAnimationFrame for better timing
        const setRef = () => {
            if (sheetRef.current) {
                bottomSheet.setRef(sheetRef);
            }
            else {
                // Retry on next frame if ref not ready
                requestAnimationFrame(setRef);
            }
        };
        setRef();
        const unsubscribe = bottomSheet.subscribe((newState) => {
            setState(newState);
        });
        return () => {
            unsubscribe();
            backHandler().remove();
            bottomSheet.destroy();
        };
    }, []);
    const renderBackdrop = useCallback((props) => (_jsx(TouchableWithoutFeedback, { onPress: () => {
            bottomSheet.close();
        }, accessible: true, accessibilityLabel: "Close bottom sheet", accessibilityRole: "button", children: _jsx(BottomSheetBackdrop, { ...props, disappearsOnIndex: -1, appearsOnIndex: 0, opacity: state.options.backdropOpacity ?? 0.3, style: [
                {
                    backgroundColor: colors.text + '33',
                },
                bottomSheetContainerStyle.backdrop,
                state.options.backdropStyle,
            ] }) })), [state.options.backdropOpacity, state.options.backdropStyle, colors.text]);
    const handleContentLayout = useCallback((event) => {
        if (state.options.enableDynamicSizing) {
            const { height } = event.nativeEvent.layout;
            bottomSheet.setContentHeight(height);
        }
    }, [state.options.enableDynamicSizing]);
    const snapPoints = React.useMemo(() => {
        return state.options.snapPoints && state.options.snapPoints.length > 0
            ? [...state.options.snapPoints]
            : [...DEFAULT_SNAP_POINTS];
    }, [state.options.snapPoints]);
    const handleSnapPointChange = useCallback((index) => {
        bottomSheet.onSnapPointChange(index);
    }, []);
    // Always render the bottom sheet, but conditionally show content
    const Component = state.component;
    return (_jsx(RNBottomSheet, { ref: sheetRef, index: state.isOpen ? state.snapIndex : -1, snapPoints: snapPoints, onChange: handleSnapPointChange, enablePanDownToClose: state.options.enablePanDownToClose ?? false, handleIndicatorStyle: { backgroundColor: colors.text }, ...(state.options.backdrop && { backdropComponent: renderBackdrop }), backgroundStyle: { backgroundColor: colors.background }, containerStyle: [
            bottomSheetContainerStyle.container,
            state.options.containerStyle,
        ], handleStyle: state.options.handleStyle, animateOnMount: false, enableContentPanningGesture: true, enableHandlePanningGesture: true, accessible: true, enableDynamicSizing: false, accessibilityLabel: "Bottom sheet", children: _jsx(BottomSheetView
        // style={layout.flex_1}
        , { 
            // style={layout.flex_1}
            onLayout: handleContentLayout, testID: "bottom-sheet-content", children: Component && _jsx(Component, { ...state.props }) }) }));
};
export default BottomSheetContainer;
const bottomSheetContainerStyle = StyleSheet.create({
    backdrop: {
        bottom: 0,
        height: '100%',
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
        width: '100%',
        zIndex: 9,
    },
    container: {
        zIndex: 1000,
    },
});
