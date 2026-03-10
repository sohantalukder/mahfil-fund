import { jsx as _jsx } from "react/jsx-runtime";
import React, { useMemo, useRef, useCallback } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme } from '@/theme';
import { screenOptions } from './screen-options/screenOptions';
const Tab = createMaterialTopTabNavigator();
const TopTabBar = ({ tabs, initialRouteName, handleStateChange, contact, backgroundColor, customTabStyle, }) => {
    const { colors } = useTheme();
    const lastReportedScreen = useRef(null);
    const debounceTimer = useRef(null);
    const options = useMemo(() => screenOptions({ colors }), [colors]);
    // Memoize the debounced handler to prevent recreation
    const handleStateChangeDebounced = useCallback((screenName) => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = setTimeout(() => {
            if (handleStateChange && screenName !== lastReportedScreen.current) {
                lastReportedScreen.current = screenName;
                handleStateChange(screenName);
            }
        }, 50);
    }, [handleStateChange]);
    // Memoize screen listeners to prevent recreation
    const screenListeners = useMemo(() => ({
        focus: (e) => {
            if (handleStateChange && e.target) {
                const screenName = e.target.split('-')[0] || '';
                handleStateChangeDebounced(screenName);
            }
        },
    }), [handleStateChange, handleStateChangeDebounced]);
    // Memoize initial route name - ensure it's never undefined
    const initialRoute = useMemo(() => initialRouteName || tabs[0]?.screenName || '', [initialRouteName, tabs]);
    // Memoize tab screens to prevent recreation
    const tabScreens = useMemo(() => tabs.map((tab) => (_jsx(Tab.Screen, { name: tab.screenName, component: tab.component, initialParams: { contact }, options: {
            tabBarLabel: tab.title,
            // Lazy load screens for better performance
            lazy: true,
        } }, tab.screenName))), [tabs]);
    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, []);
    return (_jsx(Tab.Navigator, { ...(initialRoute && { initialRouteName: initialRoute }), screenOptions: {
            ...options,
            tabBarStyle: {
                backgroundColor: colors.background,
                minHeight: 48,
                borderBottomWidth: 1,
                borderBottomColor: colors.gray8,
                marginHorizontal: 16,
                ...(customTabStyle?.tabBarStyle || {}),
            },
            tabBarScrollEnabled: customTabStyle?.tabBarScrollEnabled ?? true,
            tabBarItemStyle: {
                ...(customTabStyle?.tabBarItemStyle || { width: 'auto' }),
            },
            tabBarLabelStyle: customTabStyle?.tabBarLabelStyle || options.tabBarLabelStyle,
            sceneStyle: {
                backgroundColor: backgroundColor ?? colors.gray9,
                ...(customTabStyle?.sceneStyle || {}),
            },
        }, screenListeners: screenListeners, backBehavior: "none", children: tabScreens }));
};
export default React.memo(TopTabBar);
