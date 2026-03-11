import { Q } from '@nozbe/watermelondb';
import { database } from '@/services/db/database';
import { uuid } from '@mahfil/utils';
export async function listDonationsForEvent(eventId) {
    const collection = database.collections.get('donations');
    return collection
        .query(Q.where('event_id', eventId), Q.sortBy('donation_date', Q.desc))
        .fetch();
}
export async function createDonationOffline(draft) {
    const donations = database.collections.get('donations');
    const mutations = database.collections.get('offline_mutations');
    const clientGeneratedId = uuid();
    const opId = uuid();
    const now = Date.now();
    await database.write(async () => {
        await donations.create((d) => {
            const rec = d;
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
            const rec = m;
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
