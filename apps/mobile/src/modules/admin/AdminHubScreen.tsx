import { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import { Loader } from '@/shared/components/atoms';
import { useTheme } from '@/theme';
import { getAdminApi } from '@/api/client';
import { useCommunity } from '@/contexts/CommunityContext';
import { canAccessAdminArea, canManageUsers, activeCommunityRole } from '@/lib/guards';
import routes from '@/navigation/routes';
import {
  CalendarIcon,
  DonationIcon,
  ChartIcon,
  ReceiptIcon,
  UsersIcon,
  LinkIcon,
  CsvIcon,
  PencilIcon,
} from '@/shared/components/atoms/svg-icons/AppSvgIcons';

const fmtBDT = (n: number) =>
  `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

type CommunitySummary = {
  totalCollection: number;
  totalExpenses: number;
  balance: number;
  totalDonors: number;
};

type MenuItemConfig = {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  route: string;
  adminOnly?: boolean;
};

export default function AdminHubScreen() {
  const { colors, gutters } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { activeCommunity } = useCommunity();
  const navigation = useNavigation();
  const role = activeCommunityRole(activeCommunity);
  const isAdmin = canAccessAdminArea(role);
  const isManager = canManageUsers(role);

  const { data: summary, isLoading } = useQuery<CommunitySummary>({
    queryKey: ['admin-summary', activeCommunity?.id],
    queryFn: async () => {
      const api = getAdminApi();
      const res = await api.get<CommunitySummary>('/reports/community-summary');
      if (!res.success) throw new Error(res.error?.message ?? 'Failed');
      return res.data as CommunitySummary;
    },
    enabled: !!activeCommunity?.id && isAdmin,
  });

  const menuItems: MenuItemConfig[] = useMemo(
    () => [
      {
        icon: <DonationIcon color={colors.primary} size={22} />,
        label: 'Donations',
        subtitle: 'Manage all donations',
        route: routes.adminDonations,
      },
      {
        icon: <CalendarIcon color={colors.warning} size={22} />,
        label: 'Events',
        subtitle: 'Create & manage events',
        route: routes.adminEvents,
      },
      {
        icon: <PencilIcon color={colors.info ?? colors.secondary} size={22} />,
        label: 'Expenses',
        subtitle: 'Track community expenses',
        route: routes.adminExpenses,
      },
      {
        icon: <CsvIcon color={colors.success} size={22} />,
        label: 'Donors',
        subtitle: 'Manage donor database',
        route: routes.adminDonors,
      },
      {
        icon: <ReceiptIcon color={colors.error} size={22} />,
        label: 'Invoices',
        subtitle: 'Create & view invoices',
        route: routes.adminInvoices,
      },
      {
        icon: <ChartIcon color={colors.primary} size={22} />,
        label: 'Audit Logs',
        subtitle: 'View activity trail',
        route: routes.adminAuditLogs,
      },
      {
        icon: <UsersIcon color={colors.secondary} size={22} />,
        label: 'Users',
        subtitle: 'Manage members & roles',
        route: routes.adminUsers,
        adminOnly: true,
      },
      {
        icon: <LinkIcon color={colors.warning} size={22} />,
        label: 'Invitations',
        subtitle: 'Invite & manage members',
        route: routes.adminInvitations,
        adminOnly: true,
      },
    ],
    [colors],
  );

  const visibleItems = menuItems.filter((m) => !m.adminOnly || isManager);

  if (!activeCommunity) {
    return (
      <SafeScreen>
        <View style={gutters.padding_24}>
          <Text color="secondary">Select a community to use admin tools.</Text>
        </View>
      </SafeScreen>
    );
  }

  if (!isAdmin) {
    return (
      <SafeScreen>
        <View style={gutters.padding_24}>
          <Text variant="heading2" style={gutters.marginBottom_8}>
            No access
          </Text>
          <Text color="secondary">
            Your role ({role ?? 'none'}) cannot access admin features.
          </Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="heading3" weight="bold">
            Admin
          </Text>
          <Text variant="body3" color="secondary">
            {activeCommunity.name} · {role}
          </Text>
        </View>

        {/* Summary Stats */}
        {isLoading ? (
          <View style={styles.loaderWrap}>
            <Loader />
          </View>
        ) : summary ? (
          <View style={styles.statsGrid}>
            <StatCard
              label="Collection"
              value={fmtBDT(summary.totalCollection)}
              color={colors.success}
              colors={colors}
            />
            <StatCard
              label="Expenses"
              value={fmtBDT(summary.totalExpenses)}
              color={colors.error}
              colors={colors}
            />
            <StatCard
              label="Balance"
              value={fmtBDT(summary.balance)}
              color={colors.primary}
              colors={colors}
            />
            <StatCard
              label="Donors"
              value={String(summary.totalDonors ?? 0)}
              color={colors.warning}
              colors={colors}
            />
          </View>
        ) : null}

        {/* Menu Grid */}
        <Text variant="body2" weight="semibold" style={styles.sectionLabel}>
          Manage
        </Text>
        <View style={styles.menuGrid}>
          {visibleItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.menuCard, { backgroundColor: colors.background, borderColor: colors.gray7 }]}
              onPress={() => navigation.navigate(item.route as never)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: colors.gray9 ?? colors.gray8 }]}>
                {item.icon}
              </View>
              <Text variant="body2" weight="semibold" style={styles.menuLabel}>
                {item.label}
              </Text>
              <Text variant="body3" color="secondary" numberOfLines={1}>
                {item.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

function StatCard({
  label,
  value,
  color,
  colors,
}: {
  label: string;
  value: string;
  color: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const styles = useMemo(() => getStyles(colors), [colors]);
  return (
    <View style={[styles.statCard, { borderColor: colors.gray7 }]}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text variant="body3" color="secondary">
        {label}
      </Text>
      <Text variant="body1" weight="bold" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    header: {
      paddingTop: 16,
      paddingBottom: 20,
    },
    loaderWrap: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      minWidth: '45%',
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 12,
      padding: 14,
      gap: 4,
    },
    statDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginBottom: 4,
    },
    sectionLabel: {
      marginBottom: 12,
      color: colors.text,
    },
    menuGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    menuCard: {
      width: '47%',
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 14,
      padding: 16,
      gap: 6,
    },
    menuIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    menuLabel: {
      marginTop: 2,
    },
  });
}
