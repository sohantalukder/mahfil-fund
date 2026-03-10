import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Share, } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeScreen } from '@/shared/components/templates';
import { useTheme } from '@/theme';
import { IconButton, IconByVariant, Text } from '@/shared/components/atoms';
import rs from '@/shared/utilities/responsiveSize';
import { useNavigationHeader } from '@/shared/hooks/useNavigationHeader';
import Clipboard from '@react-native-clipboard/clipboard';
import { toast } from '@/shared/contexts/toast';
const HeaderTitle = ({ title, url }) => {
    const { layout, gutters } = useTheme();
    const handleCopyUrl = () => {
        Clipboard.setString(url);
        toast.show({
            title: 'URL copied to clipboard',
            type: 'success',
        });
    };
    return (_jsxs(View, { style: layout.flexShrink_1, children: [_jsx(Text, { weight: "semibold", variant: "body2", numberOfLines: 1, children: title }), _jsxs(View, { style: [layout.row, layout.itemsCenter, gutters.gap_4], children: [_jsx(IconByVariant, { path: "lock" }), _jsx(TouchableOpacity, { onPress: handleCopyUrl, onLongPress: handleCopyUrl, children: _jsx(Text, { variant: "body3", style: { fontSize: rs(10) }, numberOfLines: 1, children: url }) })] })] }));
};
const HeaderRight = ({ webViewRef, url, }) => {
    const { layout, gutters } = useTheme();
    const handleShare = () => {
        Share.share({
            message: 'Check out this website',
            url,
        });
    };
    return (_jsxs(View, { style: [layout.row, layout.itemsCenter, gutters.gap_8], children: [_jsx(IconButton, { icon: "refresh", onPress: () => webViewRef.current?.reload() }), _jsx(IconButton, { icon: "share", onPress: handleShare })] }));
};
const WebViewScreen = ({ route }) => {
    const { url, title } = route.params;
    const [isLoading, setIsLoading] = useState(true);
    const progressAnim = useRef(new Animated.Value(0)).current;
    const webViewRef = useRef(null);
    const { colors, layout } = useTheme();
    useNavigationHeader({
        headerTitle: (_jsx(HeaderTitle, { title: title, url: url })),
        headerTitleAlign: 'left',
        headerRight: (_jsx(HeaderRight, { webViewRef: webViewRef, url: url })),
    });
    return (_jsxs(SafeScreen, { showHeader: false, children: [_jsx(Animated.View, { style: layout.flex_1, children: _jsx(WebView, { ref: webViewRef, source: { uri: url }, onLoadStart: () => {
                        setIsLoading(true);
                    }, onLoadProgress: ({ nativeEvent }) => {
                        Animated.timing(progressAnim, {
                            toValue: nativeEvent.progress,
                            duration: 300,
                            useNativeDriver: false,
                        }).start();
                    }, onLoadEnd: () => setIsLoading(false), onError: () => toast.show({
                        title: 'Error loading page',
                        type: 'error',
                    }), javaScriptEnabled: true, domStorageEnabled: true }) }), isLoading && (_jsx(View, { style: [
                    styles.progressBarContainer,
                    { backgroundColor: colors.background },
                ], children: _jsx(Animated.View, { style: [
                        styles.progressBar,
                        {
                            width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                            }),
                            backgroundColor: colors.primary,
                        },
                    ] }) }))] }));
};
const styles = StyleSheet.create({
    progressBar: {
        height: 3,
    },
    progressBarContainer: {
        height: 3,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
    },
});
export default WebViewScreen;
