import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import layout from '@/theme/layout';
import { forwardRef, useImperativeHandle, useState, useCallback, } from 'react';
import { useTheme } from '@/theme';
import { Modal, SafeAreaView } from 'react-native';
import { StatusBar } from '../../atoms';
import { StatusBarStyle } from '../../atoms/status-bar/StatusBar';
const SlideModal = forwardRef(({ children }, ref) => {
    const { variant, colors } = useTheme();
    const [isVisible, setIsVisible] = useState(false);
    // Simple style calculations
    const containerStyle = [
        layout.flex_1,
        { backgroundColor: colors.background },
    ];
    const statusBarStyle = variant === 'dark' ? StatusBarStyle.LIGHT : StatusBarStyle.DARK;
    // Optimized modal controls
    const openModal = useCallback(() => {
        setIsVisible(true);
    }, []);
    const closeModal = useCallback(() => {
        setIsVisible(false);
    }, []);
    // Expose methods through ref
    useImperativeHandle(ref, () => ({
        openModal,
        closeModal,
        isVisible,
    }), [openModal, closeModal, isVisible]);
    return (_jsxs(Modal, { visible: isVisible, transparent: true, animationType: "slide", statusBarTranslucent: false, onRequestClose: closeModal, hardwareAccelerated: true, presentationStyle: "overFullScreen", children: [_jsx(StatusBar, { barStyle: statusBarStyle, bgColor: colors.background, translucent: false, animated: true }), _jsx(SafeAreaView, { style: containerStyle, children: children })] }));
});
SlideModal.displayName = 'SlideModal';
export default SlideModal;
