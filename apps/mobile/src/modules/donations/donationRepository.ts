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
    await donations.create((d: any) => {
      d.serverId = null;
      d.clientGeneratedId = clientGeneratedId;
      d.eventId = draft.eventId;
      d.donorId = draft.donorLocalId;
      d.donorName = draft.donorName;
      d.amount = draft.amount;
      d.paymentMethod = draft.paymentMethod;
      d.donationDateMs = draft.donationDate.getTime();
      d.syncState = 'PENDING';
      d.updatedAtMs = now;
    });

    await mutations.create((m: any) => {
      m.opId = opId;
      m.entity = 'donation';
      m.op = 'create';
      m.payloadJson = JSON.stringify({
        eventId: draft.eventId,
        donorId: draft.donorLocalId,
        amount: draft.amount,
        paymentMethod: draft.paymentMethod,
        donationDate: draft.donationDate.toISOString(),
        clientGeneratedId,
      });
      m.status = 'PENDING';
      m.retryCount = 0;
      m.lastAttemptAtMs = null;
      m.error = null;
      m.createdAtMs = now;
    });
  });

  return { opId, clientGeneratedId };
}

