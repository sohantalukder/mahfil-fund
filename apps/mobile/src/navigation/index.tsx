import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { useTheme } from '@/theme';
import type { RootStackParamList } from './types';
import routes from './routes';
import { screenOptions } from './screenOptions';
import { Donors, Home, Login, Splash, SyncCenter, Donations, Expenses } from '@/modules';
const Stack = createStackNavigator<RootStackParamList>();

const Navigation = () => {
  const { navigationTheme, variant } = useTheme();

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName={routes.splash}
        key={variant}
        screenOptions={screenOptions}
      >
        <Stack.Screen
          component={Splash}
          name={routes.splash}
        />
        <Stack.Screen
          component={Login}
          name={routes.login}
        />
        <Stack.Screen component={Home} name={routes.home} />
        <Stack.Screen component={Donors} name={routes.donors} />
        <Stack.Screen component={SyncCenter} name={routes.syncCenter} />
        <Stack.Screen component={Donations} name={routes.donations} />
        <Stack.Screen component={Expenses} name={routes.expenses} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
