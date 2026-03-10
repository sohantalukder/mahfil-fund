import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { useTheme } from '@/theme';
import routes from './routes';
import { screenOptions } from './screenOptions';
import { Donors, Home, Login, Splash, SyncCenter } from '@/modules';
const Stack = createStackNavigator();
const Navigation = () => {
    const { navigationTheme, variant } = useTheme();
    return (_jsx(NavigationContainer, { theme: navigationTheme, children: _jsxs(Stack.Navigator, { initialRouteName: routes.splash, screenOptions: screenOptions, children: [_jsx(Stack.Screen, { component: Splash, name: routes.splash }), _jsx(Stack.Screen, { component: Login, name: routes.login }), _jsx(Stack.Screen, { component: Home, name: routes.home }), _jsx(Stack.Screen, { component: Donors, name: routes.donors }), _jsx(Stack.Screen, { component: SyncCenter, name: routes.syncCenter })] }, variant) }));
};
export default Navigation;
