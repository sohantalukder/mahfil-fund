import { useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import Switch from '@/shared/components/atoms/switch/Switch';
import Divider from '@/shared/components/atoms/divider/Divider';
import { useTheme } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useMe } from '@/hooks/useMe';
import { useCommunity } from '@/contexts/CommunityContext';
import { getApi } from '@/api/client';
import routes from '@/navigation/routes';
import { navigationRef } from '@/navigation/navigationRef';
import {
  ArrowBackIcon,
  GearIcon,
  LocationPinIcon,
  PencilIcon,
  ShieldIcon,
  ChevronRightIcon,
  QuestionIcon,
  PersonIcon,
} from '@/shared/components/atoms/svg-icons/AppSvgIcons';
import IconByVariant from '@/shared/components/atoms/icon-by-variant/IconByVariant';
import { getStyles } from './styles';

const LOGO_BG = '#1A5C30';
const fmtBDT = (n: number) =>
  `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

type CommunitySummary = {
  totalCollection: number;
  totalExpenses: number;
  balance: number;
};

type ProfileRowProps = {
  leftIcon: React.ReactNode;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  titleStyle?: object;
};

function ProfileRow({
  leftIcon,
  title,
  subtitle,
  rightElement,
  onPress,
  titleStyle,
}: ProfileRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.profileRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.rowIconBox}>{leftIcon}</View>
      <View style={styles.rowText}>
        <Text variant="body2" weight="medium" style={titleStyle}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body3" color="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightElement ?? null}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { colors, gutters } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const navigation = useNavigation();
  const { session, signOut } = useAuth();
  const { globalRoles, isLoading } = useMe(!!session);
  const { activeCommunity } = useCommunity();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const name =
    (session?.user.user_metadata as Record<string, string> | undefined)
      ?.full_name ?? session?.user.email ?? '';
  const email = session?.user.email ?? '';
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const role = globalRoles.length ? globalRoles[0] : '—';

  const { data: summary } = useQuery<CommunitySummary>({
    queryKey: ['community-summary', activeCommunity?.id],
    queryFn: async () => {
      const api = getApi();
      const res = await api.get('/reports/community-summary');
      if (res && typeof res === 'object' && 'data' in res) return res.data as CommunitySummary;
      return res as CommunitySummary;
    },
    enabled: !!session && !!activeCommunity?.id,
  });

  async function onSignOut() {
    await signOut();
    navigationRef.reset({
      index: 0,
      routes: [{ name: routes.login, key: routes.login }],
    });
  }

  function navigateToSettings() {
    navigation.navigate(routes.settings as never);
  }

  return (
    <SafeScreen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowBackIcon color={colors.text} size={20} />
          </TouchableOpacity>
          <Text variant="heading3" weight="bold">
            {t('profile.title')}
          </Text>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={navigateToSettings}
            activeOpacity={0.7}
          >
            <GearIcon color={colors.text} size={20} />
          </TouchableOpacity>
        </View>

        {/* Profile Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerBg} />
          <View style={styles.bannerOverlay} />

          {/* Avatar Ring */}
          <View style={styles.avatarRingWrapper}>
            <View style={styles.avatarRing}>
              <View style={styles.avatarInitialsCircle}>
                <Text variant="heading2" weight="bold" style={styles.avatarInitials}>
                  {initials || '?'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editPencil} activeOpacity={0.7}>
              <PencilIcon color={colors.white} size={14} />
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Text variant="heading2" weight="bold" style={styles.nameText}>
            {name}
          </Text>

          {/* Role */}
          {!isLoading && (
            <Text variant="body2" style={styles.roleText}>
              {role}
            </Text>
          )}

          {/* Location */}
          <View style={styles.locationRow}>
            <LocationPinIcon color={colors.gray3} size={14} />
            <Text variant="body3" style={styles.locationText}>
              {t('profile.location')}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text variant="heading3" weight="bold">
              {fmtBDT(summary?.totalCollection ?? 0)}
            </Text>
            <Text variant="body3" color="secondary">
              {t('profile.stats_donated')}
            </Text>
          </View>
          <View style={[styles.statCol, styles.statColBorder]}>
            <Text variant="heading3" weight="bold">
              {activeCommunity ? '—' : '0'}
            </Text>
            <Text variant="body3" color="secondary">
              {t('profile.stats_donations')}
            </Text>
          </View>
          <View style={styles.statCol}>
            <Text variant="body2" weight="bold">
              {role}
            </Text>
            <Text variant="body3" color="secondary">
              {t('profile.stats_role')}
            </Text>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.sectionWrapper}>
          <Text variant="body2" weight="semibold" style={styles.sectionLabel}>
            {t('profile.section_account_settings')}
          </Text>
          <View style={styles.sectionCard}>
            <ProfileRow
              leftIcon={<PersonIcon color={colors.text} size={18} />}
              title={t('profile.edit_profile')}
              subtitle={t('profile.edit_profile_sub')}
              rightElement={<ChevronRightIcon color={colors.gray4} size={18} />}
              onPress={() => {}}
            />
            <Divider />
            <ProfileRow
              leftIcon={<ShieldIcon color={colors.text} size={18} />}
              title={t('profile.security')}
              subtitle={t('profile.security_sub')}
              rightElement={<ChevronRightIcon color={colors.gray4} size={18} />}
              onPress={() => {}}
            />
            <Divider />
            <ProfileRow
              leftIcon={
                <IconByVariant
                  path="notification"
                  width={18}
                  height={18}
                  color={colors.text}
                />
              }
              title={t('profile.notification')}
              subtitle={t('profile.notification_sub')}
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  activeColor={LOGO_BG}
                  onPress={(value) => setNotificationsEnabled(value)}
                />
              }
            />
          </View>
        </View>

        {/* Other */}
        <View style={[styles.sectionWrapper, gutters.marginBottom_20]}>
          <Text variant="body2" weight="semibold" style={styles.sectionLabel}>
            {t('profile.section_other')}
          </Text>
          <View style={styles.sectionCard}>
            <ProfileRow
              leftIcon={<QuestionIcon color={colors.text} size={18} />}
              title={t('profile.help_center')}
              rightElement={<ChevronRightIcon color={colors.gray4} size={18} />}
              onPress={() => {}}
            />
            <Divider />
            <ProfileRow
              leftIcon={
                <IconByVariant
                  path="logout"
                  width={18}
                  height={18}
                  color={colors.error}
                />
              }
              title={t('profile.sign_out')}
              titleStyle={styles.errorText}
              onPress={() => void onSignOut()}
            />
          </View>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}
