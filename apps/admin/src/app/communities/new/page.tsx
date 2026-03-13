'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { PageShell } from '../../components/shell';
import { useToast } from '../../components/toast';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '@/lib/utils';

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

function Label({ children, required, className }: { children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <label className={cn('text-sm font-medium text-foreground', className)}>
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function FormField({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label required={required}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function NewCommunityPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [form, setForm] = useState<FormData>({
    name: '', slug: '', description: '', location: '',
    district: '', thana: '', contactNumber: '', email: ''
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== '')
      );
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json() as { data?: { community: { id: string } }; error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to create');
      return json.data!;
    },
    onSuccess: () => {
      addToast({ type: 'success', message: 'Community created!' });
      router.push('/communities');
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message })
  });

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

  function handleChange(field: keyof FormData, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'name' && !prev.slug ? { slug: autoSlug(value) } : {})
    }));
  }

  return (
    <PageShell title="New Community" subtitle="Create a new community tenant">
      <form
        onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}
        className="flex max-w-2xl flex-col gap-5"
      >
        {/* Basic Information */}
        <Card className="flex flex-col gap-5">
          <div className="border-b border-border-subtle/60 pb-3">
            <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Core details that identify this community.</p>
          </div>

          <FormField label="Community Name" required>
            <Input
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Bhabanipur Youth Society"
              required
            />
          </FormField>

          <FormField
            label="Slug"
            required
            hint="Only lowercase letters, numbers, and hyphens"
          >
            <Input
              value={form.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              placeholder="e.g. bhabanipur-youth-society"
              pattern="[a-z0-9-]+"
              required
            />
          </FormField>

          <FormField label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of this community..."
              rows={3}
            />
          </FormField>
        </Card>

        {/* Location & Contact */}
        <Card className="flex flex-col gap-5">
          <div className="border-b border-border-subtle/60 pb-3">
            <h3 className="text-sm font-semibold text-foreground">Location & Contact</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Where this community is based and how to reach them.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Location">
              <Input
                value={form.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Area/Village"
              />
            </FormField>
            <FormField label="District">
              <Input
                value={form.district}
                onChange={(e) => handleChange('district', e.target.value)}
                placeholder="District"
              />
            </FormField>
            <FormField label="Thana">
              <Input
                value={form.thana}
                onChange={(e) => handleChange('thana', e.target.value)}
                placeholder="Thana"
              />
            </FormField>
            <FormField label="Contact Number">
              <Input
                value={form.contactNumber}
                onChange={(e) => handleChange('contactNumber', e.target.value)}
                placeholder="01XXXXXXXXX"
              />
            </FormField>
          </div>

          <FormField label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="contact@community.org"
            />
          </FormField>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-1">
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
            variant="default"
            size="lg"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Community'}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}
