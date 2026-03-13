'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { PageShell } from '../../components/shell';
import { useToast } from '../../components/toast';

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
    onSuccess: (data) => {
      addToast({ type: 'success', message: 'Community created!' });
      router.push(`/communities`);
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
        style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        <div className="db-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Basic Information</h3>

          <div className="db-form-group">
            <label className="db-label">Community Name *</label>
            <input
              className="db-input"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Bhabanipur Youth Society"
              required
            />
          </div>

          <div className="db-form-group">
            <label className="db-label">Slug *</label>
            <input
              className="db-input"
              value={form.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              placeholder="e.g. bhabanipur-youth-society"
              pattern="[a-z0-9-]+"
              required
            />
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>Only lowercase letters, numbers, and hyphens</span>
          </div>

          <div className="db-form-group">
            <label className="db-label">Description</label>
            <textarea
              className="db-textarea"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of this community..."
              rows={3}
            />
          </div>
        </div>

        <div className="db-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Location & Contact</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="db-form-group">
              <label className="db-label">Location</label>
              <input className="db-input" value={form.location} onChange={(e) => handleChange('location', e.target.value)} placeholder="Area/Village" />
            </div>
            <div className="db-form-group">
              <label className="db-label">District</label>
              <input className="db-input" value={form.district} onChange={(e) => handleChange('district', e.target.value)} placeholder="District" />
            </div>
            <div className="db-form-group">
              <label className="db-label">Thana</label>
              <input className="db-input" value={form.thana} onChange={(e) => handleChange('thana', e.target.value)} placeholder="Thana" />
            </div>
            <div className="db-form-group">
              <label className="db-label">Contact Number</label>
              <input className="db-input" value={form.contactNumber} onChange={(e) => handleChange('contactNumber', e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
          </div>

          <div className="db-form-group">
            <label className="db-label">Email</label>
            <input className="db-input" type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="contact@community.org" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="db-btn-secondary" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="db-btn-primary" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Community'}
          </button>
        </div>
      </form>
    </PageShell>
  );
}
