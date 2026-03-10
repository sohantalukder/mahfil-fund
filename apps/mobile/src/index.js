import { jsx as _jsx } from "react/jsx-runtime";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/theme';
import { queryClient } from '@/config/queryClient';
import Navigation from '@/navigation';
import '@/config/i18n.config';
import UiComponentsWrapper from '@/shared/contexts/UiComponentsWrapper';
import layout from './theme/layout';
import { SafeAreaProvider } from 'react-native-safe-area-context';
const MainIndex = () => {
    return (_jsx(SafeAreaProvider, { children: _jsx(GestureHandlerRootView, { style: layout.flex_1, children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(ThemeProvider, { children: _jsx(UiComponentsWrapper, { children: _jsx(Navigation, {}) }) }) }) }) }));
};
export default MainIndex;
