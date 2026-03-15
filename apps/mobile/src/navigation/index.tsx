import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './navigationRef';
import { useTheme } from '@/theme';
import type { RootStackParamList } from './types';
import routes from './routes';
import { screenOptions } from './screenOptions';
import { Splash } from '@/modules';
import LoginScreen from '@/modules/login/LoginScreen';
import MainNavigator from './MainNavigator';

const Stack = createStackNavigator<RootStackParamList>();

const Navigation = () => {
  const { navigationTheme, variant } = useTheme();

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <Stack.Navigator initialRouteName={routes.splash} key={variant} screenOptions={screenOptions}>
        <Stack.Screen name={routes.splash} component={Splash} />
        <Stack.Screen name={routes.login} component={LoginScreen} />
        <Stack.Screen name={routes.main} component={MainNavigator} options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
