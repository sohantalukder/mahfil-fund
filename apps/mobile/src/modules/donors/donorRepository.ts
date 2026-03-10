import { Q } from '@nozbe/watermelondb';
import { database } from '@/services/db/database';
import { uuid } from '@mahfil/utils';

export type DonorDraft = {
  fullName: string;
  phone: string;
  donorType: 'individual' | 'family' | 'business' | 'organization';
  preferredLanguage: 'bn' | 'en';
  tags: string[];
};

export async function listDonors(search?: string) {
  const donorsCollection = database.collections.get('donors');
  if (!search) {
    return donorsCollection.query(Q.sortBy('updated_at', Q.desc)).fetch();
  }
  const s = search.trim();
  return donorsCollection
    .query(
      Q.or(Q.where('full_name', Q.like(`%${s}%`)), Q.where('phone', Q.like(`%${s}%`))),
      Q.sortBy('updated_at', Q.desc)
    )
    .fetch();
}

export async function createDonorOffline(draft: DonorDraft) {
  const donors = database.collections.get('donors');
  const mutations = database.collections.get('offline_mutations');
  const clientGeneratedId = uuid();
  const opId = uuid();
  const now = Date.now();

  await database.write(async () => {
    await donors.create((d: any) => {
      d.serverId = null;
      d.clientGeneratedId = clientGeneratedId;
      d.fullName = draft.fullName;
      d.phone = draft.phone;
      d.donorType = draft.donorType;
      d.preferredLanguage = draft.preferredLanguage;
      d.tagsJson = JSON.stringify(draft.tags ?? []);
      d.syncState = 'PENDING';
      d.updatedAtMs = now;
    });

    await mutations.create((m: any) => {
      m.opId = opId;
      m.entity = 'donor';
      m.op = 'create';
      m.payloadJson = JSON.stringify({ ...draft, clientGeneratedId });
      m.status = 'PENDING';
      m.retryCount = 0;
      m.lastAttemptAtMs = null;
      m.error = null;
      m.createdAtMs = now;
    });
  });

  return { opId, clientGeneratedId };
}

