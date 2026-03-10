import { Dimensions } from 'react-native';
import { BottomSheetError, DEFAULT_SNAP_POINTS, DEFAULT_BACKDROP_OPACITY, DEFAULT_ANIMATION_DURATION, } from './types';
import { logger } from '@/ignoreWarnings';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
export const DEFAULT_OPTIONS = {
    snapPoints: [],
    initialSnapIndex: 1,
    backdrop: true,
    backdropOpacity: DEFAULT_BACKDROP_OPACITY,
    enablePanDownToClose: true,
    snapToClose: true,
    enableDynamicSizing: false,
    minHeight: 200,
    maxHeight: SCREEN_HEIGHT * 0.9,
    containerStyle: {},
    handleStyle: {},
    backdropStyle: {},
    onClose: () => { },
    onOpen: () => { },
    onSnapPointChange: () => { },
    maxDynamicHeight: 0,
    handleComponent: null,
};
class BottomSheetManager {
    constructor() {
        this.bottomSheetRef = null;
        this.state = {
            isOpen: false,
            snapIndex: -1,
            component: null,
            props: {},
            options: DEFAULT_OPTIONS,
        };
        this.listeners = new Set();
        this.contentHeight = 0;
        this.isAnimating = false;
        this.animationTimeout = null;
        this.isMounted = true;
        this.setRef = (ref) => {
            this.bottomSheetRef = ref;
        };
        this.subscribe = (listener) => {
            const typedListener = listener;
            this.listeners.add(typedListener);
            typedListener(this.state);
            return () => {
                this.listeners.delete(typedListener);
            };
        };
        this.getState = () => {
            return Object.freeze({ ...this.state });
        };
        this.notify = () => {
            if (!this.isMounted)
                return;
            const frozenState = Object.freeze({ ...this.state });
            this.listeners.forEach((listener) => {
                try {
                    listener(frozenState);
                }
                catch (error) {
                    logger.error('Error in bottom sheet listener:', error);
                }
            });
        };
        this.setState = (updates) => {
            this.state = { ...this.state, ...updates };
            this.notify();
        };
        this.clearAnimationTimeout = () => {
            if (this.animationTimeout) {
                clearTimeout(this.animationTimeout);
                this.animationTimeout = null;
            }
        };
        this.validateSnapPoints = (snapPoints) => {
            if (!Array.isArray(snapPoints)) {
                throw new BottomSheetError('Snap points must be an array', 'INVALID_INDEX');
            }
            if (snapPoints.length === 0) {
                throw new BottomSheetError('Snap points array cannot be empty', 'INVALID_INDEX');
            }
            for (const point of snapPoints) {
                if (typeof point === 'string' &&
                    !point.includes('%') &&
                    !point.includes('px')) {
                    throw new BottomSheetError(`Invalid snap point format: ${point}`, 'INVALID_INDEX');
                }
            }
        };
        this.generateSnapPoints = (options, contentHeight) => {
            if (options.snapPoints && options.snapPoints.length > 0) {
                this.validateSnapPoints(options.snapPoints);
                return options.snapPoints;
            }
            if (options.enableDynamicSizing && contentHeight > 0) {
                const minHeight = options.minHeight ?? DEFAULT_OPTIONS.minHeight;
                const maxHeight = options.maxHeight ?? DEFAULT_OPTIONS.maxHeight;
                const dynamicHeight = Math.max(minHeight, Math.min(contentHeight + 100, maxHeight));
                const percentage = Math.round((dynamicHeight / SCREEN_HEIGHT) * 100);
                return [`${Math.min(percentage, 90)}%`];
            }
            return [...DEFAULT_SNAP_POINTS];
        };
        this.mergeOptions = (userOptions = {}) => {
            return { ...DEFAULT_OPTIONS, ...userOptions };
        };
        /**
         * Shows a bottom sheet with the specified component and options
         * @param params - Configuration for the bottom sheet
         * @returns Promise that resolves when the sheet is fully opened
         * @throws {BottomSheetError} When animation is in progress or ref is unavailable
         */
        this.show = ({ component, componentProps = {}, options = {}, }) => {
            return new Promise((resolve, reject) => {
                if (!this.isMounted) {
                    const error = new BottomSheetError('BottomSheet manager is destroyed', 'COMPONENT_UNMOUNTED');
                    reject(error);
                    return;
                }
                if (this.isAnimating) {
                    const error = new BottomSheetError('Animation in progress', 'ANIMATION_IN_PROGRESS');
                    reject(error);
                    return;
                }
                if (!this.bottomSheetRef?.current) {
                    const error = new BottomSheetError('BottomSheet ref not available', 'REF_NOT_AVAILABLE');
                    reject(error);
                    return;
                }
                try {
                    const mergedOptions = this.mergeOptions(options);
                    const snapPoints = this.generateSnapPoints(mergedOptions, this.contentHeight);
                    const targetIndex = Math.min(Math.max(mergedOptions.initialSnapIndex ?? 0, 0), snapPoints.length - 1);
                    // Update state first
                    this.setState({
                        component: component,
                        props: componentProps,
                        options: { ...mergedOptions, snapPoints },
                        isOpen: true,
                        snapIndex: targetIndex,
                    });
                    this.isAnimating = true;
                    this.clearAnimationTimeout();
                    // Use requestAnimationFrame for better timing
                    requestAnimationFrame(() => {
                        if (!this.isMounted) {
                            this.isAnimating = false;
                            const error = new BottomSheetError('BottomSheet manager destroyed during animation', 'COMPONENT_UNMOUNTED');
                            reject(error);
                            return;
                        }
                        if (!this.bottomSheetRef?.current) {
                            this.isAnimating = false;
                            const error = new BottomSheetError('BottomSheet ref lost during animation', 'REF_NOT_AVAILABLE');
                            reject(error);
                            return;
                        }
                        try {
                            this.bottomSheetRef.current.snapToIndex(targetIndex);
                            if (mergedOptions.onOpen) {
                                mergedOptions.onOpen();
                            }
                            this.isAnimating = false;
                            resolve();
                        }
                        catch (error) {
                            logger.error('Error opening bottom sheet:', error);
                            this.isAnimating = false;
                            const bottomSheetError = new BottomSheetError(error instanceof Error
                                ? error.message
                                : 'Unknown error opening bottom sheet', 'REF_NOT_AVAILABLE');
                            reject(bottomSheetError);
                        }
                    });
                }
                catch (error) {
                    logger.error('Error opening bottom sheet:', error);
                    this.isAnimating = false;
                    const bottomSheetError = new BottomSheetError(error instanceof Error
                        ? error.message
                        : 'Unknown error opening bottom sheet', 'REF_NOT_AVAILABLE');
                    reject(bottomSheetError);
                }
            });
        };
        /**
         * Closes the bottom sheet with animation
         * @returns Promise that resolves when the sheet is fully closed
         */
        this.close = () => {
            return new Promise((resolve) => {
                if (!this.isMounted) {
                    resolve();
                    return;
                }
                if (this.isAnimating) {
                    resolve();
                    return;
                }
                if (!this.state.isOpen) {
                    resolve();
                    return;
                }
                this.isAnimating = true;
                // First call the ref's close method to trigger the animation
                if (this.bottomSheetRef?.current) {
                    try {
                        this.bottomSheetRef.current.close();
                    }
                    catch (error) {
                        logger.error('Error closing bottom sheet:', error);
                    }
                }
                if (this.state.options.onClose) {
                    this.state.options.onClose();
                }
                this.clearAnimationTimeout();
                this.animationTimeout = setTimeout(() => {
                    if (this.isMounted) {
                        this.setState({
                            isOpen: false,
                            snapIndex: -1,
                            component: null,
                            props: {},
                            options: DEFAULT_OPTIONS,
                        });
                        this.contentHeight = 0;
                    }
                    this.isAnimating = false;
                    resolve();
                }, DEFAULT_ANIMATION_DURATION);
            });
        };
        /**
         * Snaps the bottom sheet to a specific index
         * @param index - The target snap index
         * @returns Promise that resolves when the snap animation completes
         * @throws {BottomSheetError} When animation is in progress or index is invalid
         */
        this.snapToIndex = (index) => {
            return new Promise((resolve, reject) => {
                if (!this.isMounted) {
                    const error = new BottomSheetError('BottomSheet manager is destroyed', 'COMPONENT_UNMOUNTED');
                    reject(error);
                    return;
                }
                if (this.isAnimating) {
                    const error = new BottomSheetError('Animation in progress', 'ANIMATION_IN_PROGRESS');
                    reject(error);
                    return;
                }
                if (!this.bottomSheetRef?.current) {
                    const error = new BottomSheetError('BottomSheet ref not available', 'REF_NOT_AVAILABLE');
                    reject(error);
                    return;
                }
                const snapPointsLength = this.state.options.snapPoints?.length ?? 0;
                if (index < -1 || index >= snapPointsLength) {
                    const error = new BottomSheetError(`Invalid snap index: ${index}`, 'INVALID_INDEX');
                    reject(error);
                    return;
                }
                try {
                    this.bottomSheetRef.current.snapToIndex(index);
                    this.setState({ snapIndex: index });
                    resolve();
                }
                catch (error) {
                    const bottomSheetError = new BottomSheetError(error instanceof Error
                        ? error.message
                        : 'Unknown error snapping to index', 'REF_NOT_AVAILABLE');
                    reject(bottomSheetError);
                }
            });
        };
        this.collapse = () => {
            return this.snapToIndex(0);
        };
        this.onSnapPointChange = (index) => {
            this.setState({ snapIndex: index });
            if (this.state.options.onSnapPointChange) {
                this.state.options.onSnapPointChange(index);
            }
            if (index === -1 && this.state.isOpen) {
                this.setState({
                    isOpen: false,
                    component: null,
                    props: {},
                    options: DEFAULT_OPTIONS,
                });
                this.contentHeight = 0;
                if (this.state.options.onClose) {
                    this.state.options.onClose();
                }
            }
        };
        this.setContentHeight = (height) => {
            if (!this.state.options.enableDynamicSizing || height <= 0) {
                return;
            }
            this.contentHeight = height;
            if (this.state.isOpen) {
                const newSnapPoints = this.generateSnapPoints(this.state.options, height);
                this.setState({
                    options: {
                        ...this.state.options,
                        snapPoints: newSnapPoints,
                    },
                });
            }
        };
        // Utility methods
        this.isExpanded = () => {
            const snapPointsLength = this.state.options.snapPoints?.length ?? 0;
            return this.state.snapIndex === snapPointsLength - 1;
        };
        this.isCollapsed = () => {
            return this.state.snapIndex === 0;
        };
        this.isOpen = () => {
            return this.state.isOpen && this.state.snapIndex > -1;
        };
        this.getCurrentSnapIndex = () => {
            return this.state.snapIndex;
        };
        this.getContentHeight = () => {
            return this.contentHeight;
        };
        this.isAnimationInProgress = () => {
            return this.isAnimating;
        };
        /**
         * Destroys the bottom sheet manager and cleans up all resources
         */
        this.destroy = () => {
            this.isMounted = false;
            this.clearAnimationTimeout();
            this.listeners.clear();
            this.bottomSheetRef = null;
            this.setState({
                isOpen: false,
                snapIndex: -1,
                component: null,
                props: {},
                options: DEFAULT_OPTIONS,
            });
            this.contentHeight = 0;
            this.isAnimating = false;
        };
    }
}
export const bottomSheet = new BottomSheetManager();
