'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../components/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '../components/toast';
import { useProfile, useUpdateProfile, useChangePassword } from '@/hooks/useAuth';
import { UserAvatar } from '@/components/shared/UserAvatar';
import styles from './profile.module.css';
import formStyles from '@/styles/form.module.css';

export default function AdminProfilePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const changePasswordMutation = useChangePassword();

  const [fullName, setFullName] = useState('');
  const [passwords, setPasswords] = useState({
    current: '', next: '', confirm: '',
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName ?? profile.email?.split('@')[0] ?? '');
    }
  }, [profile]);

  async function handleSaveProfile() {
    try {
      await updateProfile.mutateAsync(fullName);
      toast('Profile updated successfully.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Profile update failed', 'error');
    }
  }

  async function handleChangePassword() {
    if (passwords.next !== passwords.confirm) {
      toast('Passwords do not match.', 'error');
      return;
    }
    if (passwords.next.length < 8) {
      toast('Password must be at least 8 characters.', 'error');
      return;
    }
    if (!passwords.current) {
      toast('Current password is required.', 'error');
      return;
    }
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });
      setPasswords({ current: '', next: '', confirm: '' });
      toast('Password changed successfully.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Password change failed', 'error');
    }
  }

  const displayName = profile?.fullName || profile?.email?.split('@')[0] || 'Admin';
  const role = profile?.roles?.[0] ?? 'admin';

  return (
    <PageShell title={t('dashboard.myProfile')} subtitle={t('dashboard.profileSubtitleAlt')}>
      <div className={styles.container}>
        {/* Profile card */}
        <div className={styles.card}>
          {isLoading ? (
            <div className={styles.skeleton}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonLines}>
                <div className={`${styles.skeletonLine} w-[140px]`} />
                <div className={`${styles.skeletonLine} w-[180px]`} />
              </div>
            </div>
          ) : (
            <>
              <div className={styles.profileHeader}>
                <UserAvatar name={displayName} size="lg" />
                <div>
                  <div className={styles.profileName}>{displayName}</div>
                  <div className={styles.profileEmail}>{profile?.email ?? '—'}</div>
                  <span className={styles.roleBadge}>{role}</span>
                </div>
              </div>

              <div className={styles.metaGrid}>
                <div>
                  <div className={styles.metaLabel}>Member Since</div>
                  <div className={styles.metaValue}>
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
                  </div>
                </div>
              </div>

              <div className={formStyles.field}>
                <label className={formStyles.label}>Display Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className={styles.actions}>
                <Button
                  type="button"
                  disabled={updateProfile.isPending || !fullName}
                  onClick={() => void handleSaveProfile()}
                >
                  {updateProfile.isPending ? 'Saving…' : 'Update Profile'}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Change password */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Change Password</div>
          <div className={formStyles.formGrid}>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Current Password</label>
              <Input
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                placeholder="Your current password"
              />
            </div>
            <div className={formStyles.field}>
              <label className={formStyles.label}>New Password</label>
              <Input
                type="password"
                value={passwords.next}
                onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                placeholder="Min. 8 characters"
              />
            </div>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Confirm Password</label>
              <Input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                placeholder="Repeat new password"
              />
            </div>
          </div>
          <div className={styles.actions}>
            <Button
              type="button"
              disabled={
                changePasswordMutation.isPending ||
                !passwords.current ||
                !passwords.next ||
                !passwords.confirm
              }
              onClick={() => void handleChangePassword()}
            >
              {changePasswordMutation.isPending ? 'Saving…' : 'Change Password'}
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
