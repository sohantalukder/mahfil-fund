import { createClient } from '@supabase/supabase-js';
import type { Env } from '../shared/env.js';

export type UploadResult = {
  bucket: string;
  objectPath: string;
  publicUrl?: string;
};

let supabase: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient(env: Env) {
  if (!supabase && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

export function buildStoragePath(
  entityType: 'community_logo' | 'donor_profile' | 'donation_proof' | 'expense_receipt' | 'invoice_pdf',
  communityId: string,
  options?: { eventId?: string; fileName: string }
): string {
  const fileName = options?.fileName ?? 'file';
  switch (entityType) {
    case 'community_logo':
      return `communities/${communityId}/logos/${fileName}`;
    case 'donor_profile':
      return `donors/${communityId}/profiles/${fileName}`;
    case 'donation_proof':
      return `donations/${communityId}/${options?.eventId ?? 'general'}/proofs/${fileName}`;
    case 'expense_receipt':
      return `expenses/${communityId}/${options?.eventId ?? 'general'}/receipts/${fileName}`;
    case 'invoice_pdf':
      return `invoices/${communityId}/pdfs/${fileName}`;
  }
}

export async function uploadFile(
  env: Env,
  path: string,
  data: Buffer | Uint8Array,
  contentType: string,
  isPublic = false
): Promise<UploadResult> {
  const client = getSupabaseClient(env);
  const bucket = env.SUPABASE_STORAGE_BUCKET;

  if (!client) {
    // Dev fallback: return a mock path
    return { bucket, objectPath: path };
  }

  const { error } = await client.storage.from(bucket).upload(path, data, {
    contentType,
    upsert: true
  });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  let publicUrl: string | undefined;
  if (isPublic) {
    const { data: urlData } = client.storage.from(bucket).getPublicUrl(path);
    publicUrl = urlData.publicUrl;
  }

  return { bucket, objectPath: path, publicUrl };
}

export async function deleteFile(env: Env, path: string): Promise<void> {
  const client = getSupabaseClient(env);
  if (!client) return;

  const bucket = env.SUPABASE_STORAGE_BUCKET;
  const { error } = await client.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

export async function getSignedUrl(env: Env, path: string, expiresInSeconds = 3600): Promise<string> {
  const client = getSupabaseClient(env);
  if (!client) return `/uploads/${path}`;

  const bucket = env.SUPABASE_STORAGE_BUCKET;
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(`Failed to get signed URL: ${error.message}`);
  return data.signedUrl;
}
