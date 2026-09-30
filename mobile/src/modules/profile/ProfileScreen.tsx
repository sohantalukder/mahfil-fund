 
import { useMemo, useState, useCallback } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import Switch from '@/shared/components/atoms/switch/Switch';
import Divider from '@/shared/components/atoms/divider/Divider';
import { Button, Card, Dialog, Skeleton, TextInput } from '@/shared/components/atoms';
import { BottomSheet } from '@/shared/components/atoms';
import { PasswordInput } from '@/shared/components/molecules';
import { EmptyContent } from '@/shared/components/molecules';
import { useTheme } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useMe } from '@/hooks/useMe';
import { useCommunity } from '@/contexts/CommunityContext';
import { getApi } from '@/api/client';
import { supabase } from '@/lib/supabase';
import routes from '@/navigation/routes';
import { navigationRef } from '@/navigation/navigationRef';
import { toast } from '@/shared/contexts/toast';
import { bottomSheet } from '@/shared/contexts/bottom-sheet';
import rs from '@/shared/utilities/responsiveSize';
import {
  ArrowBackIcon,
  GearIcon,
  LocationPinIcon,
  PencilIcon,
  ShieldIcon,
  ChevronRightIcon,
  PersonIcon,
  CheckCircleIcon,
  CloseIcon,
} from '@/shared/components/atoms/svg-icons/AppSvgIcons';
import IconByVariant from '@/shared/components/atoms/icon-by-variant/IconByVariant';
import { getStyles } from './styles';
import UpdateImageBottomSheet from './components/UpdateImageBottomSheet';
import type { ImagePickerResult } from '@/services/image-picker/image-picker.service';

const fmtBDT = (n: number) =>
  `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

type CommunitySummary = {
  totalCollection: number;
  totalExpenses: number;
  balance: number;
  totalDonors?: number;
};

type ProfileRowProps = {
  leftIcon: React.ReactNode;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  titleStyle?: object;
};

function ProfileRow({ leftIcon, title, subtitle, rightElement, onPress, titleStyle }: ProfileRowProps) {
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
        <Text variant="body2" weight="medium" style={titleStyle}>{title}</Text>
        {subtitle ? <Text variant="body3" color="secondary">{subtitle}</Text> : null}
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
  const { globalRoles, isLoading, invalidateMe } = useMe(!!session);
  const { activeCommunity } = useCommunity();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Edit profile sheet
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // Sign-out confirmation
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  // Change password sheet
  const [showPasswordSheet, setShowPasswordSheet] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const meta = session?.user.user_metadata as Record<string, string> | undefined;
  const name = meta?.full_name ?? session?.user.email ?? '';
  const avatarUrl = meta?.avatar_url ?? null;
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const role = globalRoles.length ? globalRoles[0] : '—';

  const { data: summary, isLoading: summaryLoading } = useQuery<CommunitySummary>({
    queryKey: ['community-summary', activeCommunity?.id],
    queryFn: async () => {
      const api = getApi();
      const res = await api.get('/reports/community-summary');
      if (!res.success) throw new Error(res.error.message);
      const raw = res.data as Record<string, unknown>;
      return {
        totalCollection: Number(raw.totalCollection ?? raw.totalDonated ?? 0),
        totalExpenses: Number(raw.totalExpenses ?? 0),
        balance: Number(raw.balance ?? 0),
        totalDonors: Number(raw.totalDonors ?? 0),
      } as CommunitySummary;
    },
    enabled: !!session && !!activeCommunity?.id,
  });

  // Recent Activity for profile
  type ActivityItem = { id: string; title: string; amount: number; date: string };
  const { data: recentActivity, isLoading: activityLoading } = useQuery<ActivityItem[]>({
    queryKey: ['profile-recent', session?.user.id],
    queryFn: async () => {
      const api = getApi();
      const res = await api.get<{ donations?: unknown[] } | unknown[]>('/donations?scope=me&limit=5');
      if (!res.success) return [];
      const d = res.data as { donations?: unknown[] } | unknown[];
      const arr: Record<string, unknown>[] = Array.isArray(d)
        ? (d as Record<string, unknown>[])
        : (((d as { donations?: unknown[] }).donations ?? []) as Record<string, unknown>[]);
      return arr.slice(0, 5).map((item) => ({
        id: String(item.id),
        title: item.donorName
          ? `From ${String(item.donorName)}`
          : item.eventSnapshotName
          ? String(item.eventSnapshotName)
          : 'Donation',
        amount: Number(item.amount),
        date: String(item.donationDate ?? item.createdAt ?? ''),
      }));
    },
    enabled: !!session,
    staleTime: 60_000,
  });

  const onSignOut = useCallback(async () => {
    await signOut();
    navigationRef.reset({ index: 0, routes: [{ name: routes.login, key: routes.login }] });
  }, [signOut]);

  const openEditSheet = useCallback(() => {
    setEditName(name);
    setEditError(null);
    setEditSuccess(false);
    setShowEditSheet(true);
  }, [name]);

  const onSaveProfile = useCallback(async () => {
    setEditError(null);
    if (!editName.trim()) { setEditError('Name cannot be empty.'); return; }
    setEditSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: editName.trim() } });
      if (error) { setEditError(error.message); return; }
      setEditSuccess(true);
      invalidateMe?.();
      toast.show({ title: 'Profile updated!', type: 'success' });
      setTimeout(() => { setShowEditSheet(false); setEditSuccess(false); }, 1200);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setEditSaving(false);
    }
  }, [editName, invalidateMe]);

  const openPasswordSheet = useCallback(() => {
    setNewPassword('');
    setConfirmPassword('');
    setPwError(null);
    setPwSuccess(false);
    setShowPasswordSheet(true);
  }, []);

  const onChangePassword = useCallback(async () => {
    setPwError(null);
    if (!newPassword) { setPwError('Please enter a new password.'); return; }
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return; }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { setPwError(error.message); return; }
      setPwSuccess(true);
      toast.show({ title: 'Password changed successfully!', type: 'success' });
      setTimeout(() => { setShowPasswordSheet(false); setPwSuccess(false); }, 1200);
    } catch (e) {
      setPwError(e instanceof Error ? e.message : 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  }, [newPassword, confirmPassword]);

  const openImagePicker = useCallback(() => {
    void bottomSheet.show({
      component: UpdateImageBottomSheet,
      componentProps: {
        onConfirm: (result: ImagePickerResult) => {
          setUploadingAvatar(true);
          void bottomSheet.close();

          // Try uploading to server; fall back to saving local URI if endpoint not ready
          const api = getApi();
          const formData = new FormData();
          formData.append('avatar', {
            uri: result.signedUrl,
            name: result.fileName,
            type: 'image/jpeg',
          } as unknown as Blob);

          api
            .postForm<{ avatarUrl?: string; url?: string }>('/users/avatar', formData)
            .then((res) => {
              const uploadedUrl =
                res.success
                  ? ((res.data as { avatarUrl?: string; url?: string }).avatarUrl ??
                     (res.data as { avatarUrl?: string; url?: string }).url ??
                     result.signedUrl)
                  : result.signedUrl; // fall back to local URI
              return supabase.auth.updateUser({ data: { avatar_url: uploadedUrl } });
            })
            .then(({ error }) => {
              if (error) {
                toast.show({ title: 'Failed to update photo.', type: 'error' });
              } else {
                toast.show({ title: 'Profile photo updated!', type: 'success' });
                invalidateMe?.();
              }
            })
            .catch(() => {
              // Server upload failed — save local URI so it shows in this session
              void supabase.auth
                .updateUser({ data: { avatar_url: result.signedUrl } })
                .then(() => {
                  toast.show({ title: 'Profile photo updated!', type: 'success' });
                  invalidateMe?.();
                });
            })
            .finally(() => setUploadingAvatar(false));
        },
        isLoading: uploadingAvatar,
      },
      options: { snapPoints: ['38%'], initialSnapIndex: 0, enablePanDownToClose: true },
    });
  }, [uploadingAvatar, invalidateMe]);

  return (
    <SafeScreen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <ArrowBackIcon color={colors.text} size={rs(20)} />
          </TouchableOpacity>
          <Text variant="heading3" weight="bold">{t('profile.title')}</Text>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate(routes.settings as never)}
            activeOpacity={0.7}
          >
            <GearIcon color={colors.text} size={rs(20)} />
          </TouchableOpacity>
        </View>

        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.avatarRingWrapper}>
            <View style={styles.avatarRing}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarInitialsCircle}>
                  <Text variant="heading2" weight="bold" style={styles.avatarInitials}>
                    {initials || '?'}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[styles.editPencil, uploadingAvatar && { opacity: 0.5 }]}
              activeOpacity={0.7}
              onPress={openImagePicker}
              disabled={uploadingAvatar}
            >
              <PencilIcon color={colors.white} size={rs(13)} />
            </TouchableOpacity>
          </View>
          <Text variant="heading2" weight="bold" style={styles.nameText}>{name}</Text>
          {isLoading ? (
            <Skeleton width={80} height={16} borderRadius={8} style={gutters.marginBottom_8} />
          ) : (
            <Text variant="body2" style={styles.roleText}>{role}</Text>
          )}
          <View style={styles.locationRow}>
            <LocationPinIcon color="rgba(255,255,255,0.55)" size={rs(14)} />
            <Text variant="body3" style={styles.locationText}>{t('profile.location')}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            {summaryLoading ? (
              <Skeleton width={60} height={20} borderRadius={6} />
            ) : (
              <Text variant="heading3" weight="bold">{fmtBDT(summary?.totalCollection ?? 0)}</Text>
            )}
            <Text variant="body3" color="secondary" style={gutters.marginTop_4}>{t('profile.stats_donated')}</Text>
          </View>
          <View style={[styles.statCol, styles.statColBorder]}>
            {summaryLoading ? (
              <Skeleton width={40} height={20} borderRadius={6} />
            ) : (
              <Text variant="heading3" weight="bold">{String(summary?.totalDonors ?? recentActivity?.length ?? 0)}</Text>
            )}
            <Text variant="body3" color="secondary" style={gutters.marginTop_4}>{t('profile.stats_donations')}</Text>
          </View>
          <View style={styles.statCol}>
            {isLoading ? (
              <Skeleton width={56} height={18} borderRadius={6} />
            ) : (
              <Text variant="body2" weight="bold">{role}</Text>
            )}
            <Text variant="body3" color="secondary" style={gutters.marginTop_4}>{t('profile.stats_role')}</Text>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.sectionWrapper}>
          <Text variant="body2" weight="semibold" style={styles.sectionLabel}>
            {t('profile.section_account_settings')}
          </Text>
          <View style={styles.sectionCard}>
            <ProfileRow
              leftIcon={<PersonIcon color={colors.primary} size={rs(18)} />}
              title={t('profile.edit_profile')}
              subtitle={t('profile.edit_profile_sub')}
              rightElement={<ChevronRightIcon color={colors.gray5} size={rs(18)} />}
              onPress={openEditSheet}
            />
            <Divider />
            <ProfileRow
              leftIcon={<ShieldIcon color={colors.primary} size={rs(18)} />}
              title={t('profile.security')}
              subtitle={t('profile.security_sub')}
              rightElement={<ChevronRightIcon color={colors.gray5} size={rs(18)} />}
              onPress={openPasswordSheet}
            />
            <Divider />
            <ProfileRow
              leftIcon={<IconByVariant path="notification" width={rs(18)} height={rs(18)} color={colors.primary} />}
              title={t('profile.notification')}
              subtitle={t('profile.notification_sub')}
              rightElement={
                <Switch value={notificationsEnabled} activeColor={colors.primary} onPress={setNotificationsEnabled} />
              }
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionWrapper}>
          <Text variant="body2" weight="semibold" style={styles.sectionLabel}>Recent Activity</Text>
          <View style={styles.sectionCard}>
            {activityLoading ? (
              <>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[activityRowStyle.row, { borderBottomColor: colors.gray7 }]}>
                    <Skeleton width={40} height={40} borderRadius={20} />
                    <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
                      <Skeleton width="60%" height={12} borderRadius={6} />
                      <Skeleton width="35%" height={10} borderRadius={5} />
                    </View>
                    <Skeleton width={60} height={12} borderRadius={6} />
                  </View>
                ))}
              </>
            ) : (recentActivity ?? []).length === 0 ? (
              <EmptyContent
                icon="emptyContent"
                title="No activity yet"
                description="Your donations and transactions will appear here."
                style={styles.emptyActivity}
              />
            ) : (
              (recentActivity ?? []).map((item, idx) => (
                <View key={item.id}>
                  <View style={activityRowStyle.row}>
                    <View style={[activityRowStyle.icon, { backgroundColor: colors.primary + '18' }]}>
                      <IconByVariant path="send" width={rs(18)} height={rs(18)} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="body2" weight="medium" numberOfLines={1}>{item.title}</Text>
                      <Text variant="body3" color="secondary">{item.date.slice(0, 10)}</Text>
                    </View>
                    <Text variant="body2" weight="semibold" style={{ color: colors.success }}>
                      +{fmtBDT(item.amount)}
                    </Text>
                  </View>
                  {idx < (recentActivity?.length ?? 0) - 1 && <Divider />}
                </View>
              ))
            )}
          </View>
        </View>

        {/* Other */}
        <View style={[styles.sectionWrapper, gutters.marginBottom_20]}>
          <Text variant="body2" weight="semibold" style={styles.sectionLabel}>{t('profile.section_other')}</Text>
          <View style={styles.sectionCard}>
            <ProfileRow
              leftIcon={<IconByVariant path="logout" width={rs(18)} height={rs(18)} color={colors.error} />}
              title={t('profile.sign_out')}
              titleStyle={styles.errorText}
              onPress={() => setShowSignOutDialog(true)}
            />
          </View>
        </View>
      </ScrollView>

      {/* Change Password Sheet */}
      <BottomSheet
        visible={showPasswordSheet}
        onRequestClose={() => setShowPasswordSheet(false)}
        maxHeight={520}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={sheetStyles.inner}>
            <View style={sheetStyles.titleRow}>
              <View style={[sheetStyles.titleIcon, { backgroundColor: colors.primary + '18' }]}>
                <ShieldIcon color={colors.primary} size={rs(18)} />
              </View>
              <View style={sheetStyles.titleTxt}>
                <Text variant="body1" weight="bold">Change Password</Text>
              </View>
              <TouchableOpacity
                style={sheetStyles.closeBtn}
                onPress={() => setShowPasswordSheet(false)}
                activeOpacity={0.7}
              >
                <CloseIcon color={colors.gray4} size={rs(18)} />
              </TouchableOpacity>
            </View>

            <Text variant="body3" color="secondary" style={gutters.marginBottom_20}>
              Choose a strong password with at least 8 characters.
            </Text>

            <PasswordInput
              label="New password"
              placeholder="Min. 8 characters"
              value={newPassword}
              onChangeText={(v) => { setNewPassword(v); setPwError(null); }}
              wrapperStyle={gutters.marginBottom_16}
            />

            <PasswordInput
              label="Confirm new password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); setPwError(null); }}
              wrapperStyle={gutters.marginBottom_20}
            />

            {pwError ? (
              <Card
                variant="outlined"
                borderColor={colors.error}
                backgroundColor={colors.error + '12'}
                padding={12}
                borderRadius={10}
                shadow={false}
                style={gutters.marginBottom_16}
              >
                <Text variant="body3" color="error">{pwError}</Text>
              </Card>
            ) : null}

            {pwSuccess ? (
              <View style={sheetStyles.successRow}>
                <CheckCircleIcon color={colors.success} size={rs(16)} />
                <Text variant="body3" style={{ color: colors.success }}>Password changed!</Text>
              </View>
            ) : (
              <Button
                text={pwSaving ? 'Saving…' : 'Change Password'}
                onPress={() => void onChangePassword()}
                disabled={pwSaving}
                isLoading={pwSaving}
                borderRadius={12}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>

      {/* Edit Profile Sheet */}
      <BottomSheet
        visible={showEditSheet}
        onRequestClose={() => setShowEditSheet(false)}
        maxHeight={440}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={sheetStyles.inner}>
            <View style={sheetStyles.titleRow}>
              <View style={[sheetStyles.titleIcon, { backgroundColor: colors.primary + '18' }]}>
                <PersonIcon color={colors.primary} size={rs(18)} />
              </View>
              <View style={sheetStyles.titleTxt}><Text variant="body1" weight="bold">Edit Profile</Text></View>
              <TouchableOpacity
                style={sheetStyles.closeBtn}
                onPress={() => setShowEditSheet(false)}
                activeOpacity={0.7}
              >
                <CloseIcon color={colors.gray4} size={rs(18)} />
              </TouchableOpacity>
            </View>

            <Text variant="body3" color="secondary" style={gutters.marginBottom_20}>
              Update your display name shown across the app.
            </Text>

            <TextInput
              label="Full name"
              placeholder="Your full name"
              value={editName}
              onChangeText={(v) => { setEditName(v); setEditError(null); }}
              autoCapitalize="words"
              autoCorrect={false}
              wrapperStyle={gutters.marginBottom_16}
            />

            {editError ? (
              <Card
                variant="outlined"
                borderColor={colors.error}
                backgroundColor={colors.error + '12'}
                padding={12}
                borderRadius={10}
                shadow={false}
                style={gutters.marginBottom_16}
              >
                <Text variant="body3" color="error">{editError}</Text>
              </Card>
            ) : null}

            {editSuccess ? (
              <View style={sheetStyles.successRow}>
                <CheckCircleIcon color={colors.success} size={rs(16)} />
                <Text variant="body3" style={{ color: colors.success }}>Saved!</Text>
              </View>
            ) : (
              <Button
                text={editSaving ? 'Saving…' : 'Save Changes'}
                onPress={() => onSaveProfile()}
                disabled={editSaving}
                isLoading={editSaving}
                borderRadius={12}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>

      {/* Sign-out confirmation */}
      <Dialog
        visible={showSignOutDialog}
        title="Sign Out"
        description="Are you sure you want to sign out of your account?"
        buttons={[
          {
            label: 'Cancel',
            type: 'outline',
            onPress: () => setShowSignOutDialog(false),
          },
          {
            label: 'Sign Out',
            type: 'error',
            onPress: () => {
              setShowSignOutDialog(false);
              void onSignOut();
            },
          },
        ]}
        onDismiss={() => setShowSignOutDialog(false)}
      />
    </SafeScreen>
  );
}

const activityRowStyle = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  icon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});

const sheetStyles = StyleSheet.create({
  closeBtn: { padding: 4 },
  inner: { padding: 24, paddingBottom: 32 },
  successRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 12 },
  titleIcon: { alignItems: 'center', borderRadius: rs(10), height: rs(36), justifyContent: 'center', width: rs(36) },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 6 },
  titleTxt: { flex: 1 },
});
