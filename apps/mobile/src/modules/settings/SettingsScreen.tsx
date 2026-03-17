import { useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import i18n from 'i18next';

import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import Button from '@/shared/components/atoms/buttons/Button';
import Switch from '@/shared/components/atoms/switch/Switch';
import Divider from '@/shared/components/atoms/divider/Divider';
import { useTheme } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useCommunity } from '@/contexts/CommunityContext';
import localStore from '@/services/storage/localStore.service';
import routes from '@/navigation/routes';
import { navigationRef } from '@/navigation/navigationRef';
import {
  ArrowBackIcon,
  CalendarIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  CloseIcon,
  CloudSyncIcon,
  CloudCheckIcon,
  CsvIcon,
  CurrencyIcon,
  GlobeIcon,
  MoonIcon,
  UploadIcon,
  DownloadIcon,
} from '@/shared/components/atoms/svg-icons/AppSvgIcons';
import IconByVariant from '@/shared/components/atoms/icon-by-variant/IconByVariant';
import { getStyles } from './styles';

const LOGO_BG = '#1A5C30';

type SettingsRowProps = {
  leftIcon: React.ReactNode;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  titleStyle?: object;
};

function SettingsRow({
  leftIcon,
  title,
  subtitle,
  rightElement,
  onPress,
  titleStyle,
}: SettingsRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.row}
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
      {rightElement ? <View style={styles.rowRight}>{rightElement}</View> : null}
    </TouchableOpacity>
  );
}

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
};

function SettingsSection({ title, children }: SettingsSectionProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View>
      <Text variant="body3" weight="semibold" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors, gutters, variant, changeTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const navigation = useNavigation();
  const { session, signOut } = useAuth();
  const { activeCommunity } = useCommunity();

  const isDark = variant === 'dark';
  const storedLang = localStore.getSystemLanguage();
  const [currentLang, setCurrentLang] = useState<'en' | 'bn'>(
    storedLang === 'bn' ? 'bn' : 'en',
  );
  const [showSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const name =
    (session?.user.user_metadata as Record<string, string> | undefined)
      ?.full_name ?? session?.user.email ?? '';
  const email = session?.user.email ?? '';
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  async function handleLanguage(lang: 'en' | 'bn') {
    const lng = lang === 'en' ? 'en-EN' : 'bn-BN';
    await i18n.changeLanguage(lng);
    localStore.setSystemLanguage(lang);
    setCurrentLang(lang);
  }

  function handleTheme(value: boolean) {
    changeTheme(value ? 'dark' : 'light');
  }

  async function handleSync() {
    setIsSyncing(true);
    await new Promise<void>((res) => setTimeout(res, 1500));
    setIsSyncing(false);
  }

  async function handleSignOut() {
    await signOut();
    navigationRef.reset({
      index: 0,
      routes: [{ name: routes.login, key: routes.login }],
    });
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
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowBackIcon color={colors.text} size={20} />
          </TouchableOpacity>
          <Text variant="heading3" weight="bold">
            {t('settings.title')}
          </Text>
        </View>

        {/* Success bar */}
        {showSuccess && (
          <View style={styles.successBar}>
            <CheckCircleIcon color={LOGO_BG} size={18} />
            <Text variant="body2" style={styles.successText}>
              {t('settings.success_import')}
            </Text>
            <TouchableOpacity style={styles.successClose} activeOpacity={0.7}>
              <CloseIcon color={LOGO_BG} size={16} />
            </TouchableOpacity>
          </View>
        )}

        {/* EVENT MANAGEMENT */}
        <SettingsSection title={t('settings.section_event')}>
          <SettingsRow
            leftIcon={<CalendarIcon color={colors.text} size={18} />}
            title={t('settings.start_new_year')}
            subtitle={t('settings.start_new_year_sub')}
            rightElement={<ChevronRightIcon color={colors.gray4} size={18} />}
            onPress={() => {}}
          />
          <Divider />
          <SettingsRow
            leftIcon={<CalendarIcon color={colors.text} size={18} />}
            title={t('settings.view_previous')}
            rightElement={
              <IconByVariant
                path="downArrow"
                width={18}
                height={18}
                color={colors.gray4}
              />
            }
            onPress={() => {}}
          />
        </SettingsSection>

        {/* DONOR DATABASE */}
        <SettingsSection title={t('settings.section_donor')}>
          <SettingsRow
            leftIcon={
              <IconByVariant
                path="people"
                width={18}
                height={18}
                color={colors.text}
              />
            }
            title={t('settings.master_donor_list')}
            subtitle={t('settings.master_donor_list_sub')}
            rightElement={<ChevronRightIcon color={colors.gray4} size={18} />}
            onPress={() => {}}
          />
          <Divider />
          <SettingsRow
            leftIcon={<CsvIcon color={colors.text} size={18} />}
            title={t('settings.export_csv')}
            subtitle={t('settings.export_csv_sub')}
            rightElement={<DownloadIcon color={colors.gray4} size={18} />}
            onPress={() => {}}
          />
          <Divider />
          <SettingsRow
            leftIcon={<UploadIcon color={colors.text} size={18} />}
            title={t('settings.import_csv')}
            subtitle={t('settings.import_csv_sub')}
            rightElement={<CsvIcon color={colors.gray4} size={18} />}
            onPress={() => {}}
          />
        </SettingsSection>

        {/* CLOUD SYNC */}
        <SettingsSection title={t('settings.section_cloud')}>
          <View style={styles.cloudSyncRow}>
            <View style={styles.rowIconBox}>
              <CloudCheckIcon color={LOGO_BG} size={18} />
            </View>
            <View style={styles.cloudSyncContent}>
              <Text variant="body2" weight="medium">
                {t('settings.cloud_sync')}
              </Text>
              <Text variant="body3" style={styles.cloudSyncStatus}>
                {t('settings.cloud_sync_status')}
              </Text>
              <Text variant="body3" style={styles.cloudSyncMeta}>
                {t('settings.last_synced', { time: '2 minutes ago' })}
              </Text>
            </View>
            <Button
              text={t('settings.sync_now')}
              variant="outline"
              isLoading={isSyncing}
              onPress={() => void handleSync()}
            />
          </View>
        </SettingsSection>

        {/* APP PREFERENCES */}
        <SettingsSection title={t('settings.section_prefs')}>
          <SettingsRow
            leftIcon={<CurrencyIcon color={colors.text} size={18} />}
            title={t('settings.currency')}
            rightElement={
              <Text variant="body2" weight="semibold">
                {t('settings.currency_value')}
              </Text>
            }
          />
          <Divider />
          <SettingsRow
            leftIcon={<GlobeIcon color={colors.text} size={18} />}
            title={t('settings.language')}
            rightElement={
              <View style={styles.langToggle}>
                <TouchableOpacity
                  style={[
                    styles.langBtn,
                    currentLang === 'en'
                      ? styles.langBtnActive
                      : styles.langBtnInactive,
                  ]}
                  onPress={() => void handleLanguage('en')}
                  activeOpacity={0.7}
                >
                  <Text
                    variant="body3"
                    weight="semibold"
                    style={
                      currentLang === 'en'
                        ? styles.langTextActive
                        : styles.langTextInactive
                    }
                  >
                    EN
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.langBtn,
                    currentLang === 'bn'
                      ? styles.langBtnActive
                      : styles.langBtnInactive,
                  ]}
                  onPress={() => void handleLanguage('bn')}
                  activeOpacity={0.7}
                >
                  <Text
                    variant="body3"
                    weight="semibold"
                    style={
                      currentLang === 'bn'
                        ? styles.langTextActive
                        : styles.langTextInactive
                    }
                  >
                    BN
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
          <Divider />
          <SettingsRow
            leftIcon={<MoonIcon color={colors.text} size={18} />}
            title={t('settings.theme')}
            rightElement={
              <Switch
                value={isDark}
                activeColor={LOGO_BG}
                onPress={(value) => handleTheme(value)}
              />
            }
          />
        </SettingsSection>

        {/* ACCOUNT */}
        <SettingsSection title={t('settings.section_account')}>
          <View style={styles.accountRow}>
            <View style={styles.initialsCircle}>
              <Text variant="body1" weight="bold" style={styles.initialsText}>
                {initials || '?'}
              </Text>
            </View>
            <View style={styles.accountInfo}>
              <Text variant="body2" weight="semibold">
                {name}
              </Text>
              <Text variant="body3" color="secondary">
                {email}
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text variant="body2" weight="semibold" style={styles.editBtn}>
                {t('common.edit')}
              </Text>
            </TouchableOpacity>
          </View>
          <Divider />
          <SettingsRow
            leftIcon={
              <IconByVariant
                path="logout"
                width={18}
                height={18}
                color={colors.error}
              />
            }
            title={t('settings.log_out')}
            titleStyle={styles.logoutText}
            onPress={() => void handleSignOut()}
          />
        </SettingsSection>

        <View style={gutters.marginBottom_20} />
      </ScrollView>
    </SafeScreen>
  );
}
