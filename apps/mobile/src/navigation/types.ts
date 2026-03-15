import routes from './routes';

export type RootStackParamList = {
  [routes.splash]: undefined;
  [routes.login]: undefined;
  [routes.main]: undefined;
};

export type NavigationProp = import('@react-navigation/stack').StackNavigationProp<
  RootStackParamList,
  keyof RootStackParamList
>;
