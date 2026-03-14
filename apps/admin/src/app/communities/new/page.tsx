'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { getApi } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../../components/shell';
import { useToast } from '../../components/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import formStyles from '@/styles/form.module.css';
import styles from './new-community.module.css';

interface FormData {
  name: string;
  slug: string;
  description: string;
  location: string;
  district: string;
  thana: string;
  contactNumber: string;
  email: string;
}

export default function NewCommunityPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<FormData>({
    name: '', slug: '', description: '', location: '',
    district: '', thana: '', contactNumber: '', email: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== '')
      );
      const json = await getApi().post<{ community: { id: string } }>('/communities', payload);
      if (!json.success) throw new Error(json.error.message ?? 'Failed to create');
      return json.data;
    },
    onSuccess: () => {
      toast('Community created!', 'success');
      router.push('/communities');
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

  function handleChange(field: keyof FormData, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'name' && !prev.slug ? { slug: autoSlug(value) } : {}),
    }));
  }

  return (
    <PageShell title={t('dashboard.newCommunity')} subtitle={t('dashboard.newCommunitySubtitle')}>
      <form
        onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}
        className={styles.form}
      >
        {/* Basic Information */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Basic Information</h3>
            <p className={styles.sectionDesc}>Core details that identify this community.</p>
          </div>

          <div className={formStyles.formGrid}>
            <div className={formStyles.field}>
              <label className={`${formStyles.label} ${formStyles.labelRequired}`}>
                Community Name
              </label>
              <Input
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Bhabanipur Youth Society"
                required
              />
            </div>

            <div className={formStyles.field}>
              <label className={`${formStyles.label} ${formStyles.labelRequired}`}>
                Slug
              </label>
              <Input
                value={form.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                placeholder="e.g. bhabanipur-youth-society"
                pattern="[a-z0-9-]+"
                required
              />
              <span className={formStyles.fieldHint}>
                Only lowercase letters, numbers, and hyphens
              </span>
            </div>

            <div className={formStyles.field}>
              <label className={formStyles.label}>Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Brief description of this community…"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Location & Contact */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Location & Contact</h3>
            <p className={styles.sectionDesc}>Where this community is based and how to reach them.</p>
          </div>

          <div className={formStyles.formGrid}>
            <div className={formStyles.formRow}>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Location</label>
                <Input
                  value={form.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="Area/Village"
                />
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label}>District</label>
                <Input
                  value={form.district}
                  onChange={(e) => handleChange('district', e.target.value)}
                  placeholder="District"
                />
              </div>
            </div>
            <div className={formStyles.formRow}>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Thana</label>
                <Input
                  value={form.thana}
                  onChange={(e) => handleChange('thana', e.target.value)}
                  placeholder="Thana"
                />
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Contact Number</label>
                <Input
                  value={form.contactNumber}
                  onChange={(e) => handleChange('contactNumber', e.target.value)}
                  placeholder="01XXXXXXXXX"
                />
              </div>
            </div>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="contact@community.org"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.formActions}>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating…' : 'Create Community'}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}
