import { Q } from '@nozbe/watermelondb';
import { database } from '@/services/db/database';
import { uuid } from '@mahfil/utils';

export type DonationDraft = {
  eventId: string;
  donorLocalId: string;
  donorName: string;
  amount: number;
  paymentMethod: 'CASH' | 'BKASH' | 'NAGAD' | 'BANK';
  donationDate: Date;
};

export async function listDonationsForEvent(eventId: string) {
  const collection = database.collections.get('donations');
  return collection
    .query(Q.where('event_id', eventId), Q.sortBy('donation_date', Q.desc))
    .fetch();
}

export async function createDonationOffline(draft: DonationDraft) {
  const donations = database.collections.get('donations');
  const mutations = database.collections.get('offline_mutations');
  const clientGeneratedId = uuid();
  const opId = uuid();
  const now = Date.now();

  await database.write(async () => {
    await donations.create((d) => {
      const rec = d as unknown as Record<string, unknown>;
      Object.assign(rec, {
        serverId: null,
        clientGeneratedId,
        eventId: draft.eventId,
        donorId: draft.donorLocalId,
        donorName: draft.donorName,
        amount: draft.amount,
        paymentMethod: draft.paymentMethod,
        donationDateMs: draft.donationDate.getTime(),
        syncState: 'PENDING',
        updatedAtMs: now,
      });
    });

    await mutations.create((m) => {
      const rec = m as unknown as Record<string, unknown>;
      Object.assign(rec, {
        opId,
        entity: 'donation',
        op: 'create',
        payloadJson: JSON.stringify({
          eventId: draft.eventId,
          donorId: draft.donorLocalId,
          amount: draft.amount,
          paymentMethod: draft.paymentMethod,
          donationDate: draft.donationDate.toISOString(),
          clientGeneratedId,
        }),
        status: 'PENDING',
        retryCount: 0,
        lastAttemptAtMs: null,
        error: null,
        createdAtMs: now,
      });
    });
  });

  return { opId, clientGeneratedId };
}
