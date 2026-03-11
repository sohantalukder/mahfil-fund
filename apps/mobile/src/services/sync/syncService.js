import { Q } from '@nozbe/watermelondb';
import { database } from '@/services/db/database';
import { api } from '@/services/api/apiClient';
import { useStore } from '@/state/store';
export async function refreshPendingCount() {
    const mutations = database.collections.get('offline_mutations');
    const pending = await mutations
        .query(Q.where('status', Q.oneOf(['PENDING', 'FAILED'])))
        .fetchCount();
    useStore.getState().setSyncStatus({ pendingCount: pending });
}
export async function runSync() {
    const { isOnline, isSyncing } = useStore.getState();
    if (!isOnline || isSyncing)
        return;
    useStore.getState().setSyncStatus({ isSyncing: true, lastError: null });
    try {
        const mutationsCollection = database.collections.get('offline_mutations');
        const mutations = await mutationsCollection
            .query(Q.where('status', Q.oneOf(['PENDING', 'FAILED'])), Q.sortBy('created_at', Q.asc), Q.take(50))
            .fetch();
        if (mutations.length === 0) {
            useStore.getState().setSyncStatus({ isSyncing: false });
            return;
        }
        const ops = mutations.map((m) => {
            const rec = m;
            return {
                opId: rec.opId,
                entity: rec.entity,
                op: rec.op,
                payload: rec.payload,
            };
        });
        // Mark as syncing
        await database.write(async () => {
            for (const m of mutations) {
                await m.update((x) => {
                    const rec = x;
                    Object.assign(rec, {
                        status: 'SYNCING',
                        lastAttemptAtMs: Date.now(),
                        error: null,
                    });
                });
            }
        });
        const res = await api.post('/sync/push', { operations: ops });
        if (!res.success)
            throw new Error(res.error.message);
        const byOpId = new Map(res.data.results.map((r) => [r.opId, r]));
        await database.write(async () => {
            const donorsCollection = database.collections.get('donors');
            for (const m of mutations) {
                const mRec = m;
                const r = byOpId.get(mRec.opId);
                if (!r)
                    continue;
                if (r.success) {
                    await m.update((x) => {
                        Object.assign(x, {
                            status: 'SYNCED',
                            error: null,
                        });
                    });
                    // Best-effort: update donor sync status if mutation payload had clientGeneratedId
                    if (mRec.entity === 'donor' && mRec.op === 'create') {
                        const payload = mRec.payload;
                        const cg = payload?.clientGeneratedId;
                        if (typeof cg === 'string') {
                            const matches = await donorsCollection
                                .query(Q.where('client_generated_id', cg))
                                .fetch();
                            for (const d of matches) {
                                await d.update((dd) => {
                                    const ddRec = dd;
                                    Object.assign(ddRec, {
                                        syncState: 'SYNCED',
                                        serverId: r.serverId ?? ddRec.serverId,
                                        updatedAtMs: Date.now(),
                                    });
                                });
                            }
                        }
                    }
                }
                else {
                    await m.update((x) => {
                        const xRec = x;
                        Object.assign(xRec, {
                            status: 'FAILED',
                            retryCount: (xRec.retryCount ?? 0) + 1,
                            error: r.error ?? 'Failed',
                        });
                    });
                }
            }
        });
        useStore.getState().setSyncStatus({ lastSyncAt: new Date().toISOString() });
        await refreshPendingCount();
    }
    catch (e) {
        useStore.getState().setSyncStatus({
            lastError: e instanceof Error ? e.message : 'Sync failed',
        });
        await refreshPendingCount();
    }
    finally {
        useStore.getState().setSyncStatus({ isSyncing: false });
    }
}
