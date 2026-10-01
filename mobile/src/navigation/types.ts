import routes from './routes';

export type RootStackParamList = {
  [routes.splash]: undefined;
  [routes.login]: undefined;
  [routes.forgotPassword]: undefined;
  [routes.main]: undefined;
};

export type MenuStackParamList = {
  MenuHub: undefined;
  [routes.events]: undefined;
  [routes.donations]: undefined;
  [routes.reports]: undefined;
  [routes.addExpense]: undefined;
  [routes.expenses]: undefined;
  [routes.admin]: undefined;
  [routes.adminEvents]: undefined;
  [routes.adminDonations]: undefined;
  [routes.adminExpenses]: undefined;
  [routes.adminDonors]: undefined;
  [routes.adminAddDonor]: {
    donor?: {
      id: string;
      name: string;
      phone: string;
      altPhone?: string;
      address?: string;
      donorType: 'INDIVIDUAL' | 'ORGANIZATION';
      note?: string;
    };
  } | undefined;
  [routes.adminDonorDonations]: { donorId: string; donorName: string };
  [routes.adminInvoices]: undefined;
  [routes.adminAddInvoice]: undefined;
  [routes.adminUsers]: undefined;
  [routes.adminAuditLogs]: undefined;
  [routes.platformUsers]: undefined;
};

export type NavigationProp = import('@react-navigation/stack').StackNavigationProp<
  RootStackParamList,
  keyof RootStackParamList
>;
