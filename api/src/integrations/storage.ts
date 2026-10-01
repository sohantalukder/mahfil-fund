import { StorageClient } from '@supabase/storage-js';
import type { Env } from '../shared/env.js';

export type UploadResult = {
  bucket: string;
  objectPath: string;
  publicUrl?: string;
};

let storage: StorageClient | null = null;

export function getStorageClient(env: Env) {
  if (!storage && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    storage = new StorageClient(`${env.SUPABASE_URL.replace(/\/+$/, '')}/storage/v1`, {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    });
  }
  return storage;
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
  const client = getStorageClient(env);
  const bucket = env.SUPABASE_STORAGE_BUCKET;

  if (!client) {
    if (env.NODE_ENV === 'test') return { bucket, objectPath: path };
    throw new Error('Object storage is not configured');
  }

  const { error } = await client.from(bucket).upload(path, data, {
    contentType,
    upsert: false
  });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  let publicUrl: string | undefined;
  if (isPublic) {
    const { data: urlData } = client.from(bucket).getPublicUrl(path);
    publicUrl = urlData.publicUrl;
  }

  return { bucket, objectPath: path, publicUrl };
}

export async function deleteFile(env: Env, path: string): Promise<void> {
  const client = getStorageClient(env);
  if (!client) {
    if (env.NODE_ENV === 'test') return;
    throw new Error('Object storage is not configured');
  }

  const bucket = env.SUPABASE_STORAGE_BUCKET;
  const { error } = await client.from(bucket).remove([path]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

export async function getSignedUrl(env: Env, path: string, expiresInSeconds = 3600): Promise<string> {
  const client = getStorageClient(env);
  if (!client) throw new Error('Object storage is not configured');

  const bucket = env.SUPABASE_STORAGE_BUCKET;
  const { data, error } = await client.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(`Failed to get signed URL: ${error.message}`);
  return data.signedUrl;
}
