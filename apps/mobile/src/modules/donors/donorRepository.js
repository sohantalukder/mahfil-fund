import { Q } from '@nozbe/watermelondb';
import { database } from '@/services/db/database';
import { uuid } from '@mahfil/utils';
export async function listDonors(search) {
    const donorsCollection = database.collections.get('donors');
    if (!search) {
        return donorsCollection.query(Q.sortBy('updated_at', Q.desc)).fetch();
    }
    const s = search.trim();
    return donorsCollection
        .query(Q.or(Q.where('full_name', Q.like(`%${s}%`)), Q.where('phone', Q.like(`%${s}%`))), Q.sortBy('updated_at', Q.desc))
        .fetch();
}
export async function createDonorOffline(draft) {
    const donors = database.collections.get('donors');
    const mutations = database.collections.get('offline_mutations');
    const clientGeneratedId = uuid();
    const opId = uuid();
    const now = Date.now();
    await database.write(async () => {
        await donors.create((d) => {
            const rec = d;
            Object.assign(rec, {
                serverId: null,
                clientGeneratedId,
                fullName: draft.fullName,
                phone: draft.phone,
                donorType: draft.donorType,
                preferredLanguage: draft.preferredLanguage,
                tagsJson: JSON.stringify(draft.tags ?? []),
                syncState: 'PENDING',
                updatedAtMs: now,
            });
        });
        await mutations.create((m) => {
            const rec = m;
            Object.assign(rec, {
                opId,
                entity: 'donor',
                op: 'create',
                payloadJson: JSON.stringify({ ...draft, clientGeneratedId }),
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
