import { Q } from '@nozbe/watermelondb';
import { database } from '@/services/db/database';
import { uuid } from '@mahfil/utils';
export async function listExpensesForEvent(eventId) {
    const collection = database.collections.get('expenses');
    return collection
        .query(Q.where('event_id', eventId), Q.sortBy('expense_date', Q.desc))
        .fetch();
}
export async function createExpenseOffline(draft) {
    const expenses = database.collections.get('expenses');
    const mutations = database.collections.get('offline_mutations');
    const clientGeneratedId = uuid();
    const opId = uuid();
    const now = Date.now();
    await database.write(async () => {
        await expenses.create((e) => {
            const rec = e;
            Object.assign(rec, {
                serverId: null,
                clientGeneratedId,
                eventId: draft.eventId,
                title: draft.title,
                category: draft.category,
                amount: draft.amount,
                expenseDateMs: draft.expenseDate.getTime(),
                syncState: 'PENDING',
                updatedAtMs: now,
            });
        });
        await mutations.create((m) => {
            const rec = m;
            Object.assign(rec, {
                opId,
                entity: 'expense',
                op: 'create',
                payloadJson: JSON.stringify({
                    eventId: draft.eventId,
                    title: draft.title,
                    category: draft.category,
                    amount: draft.amount,
                    expenseDate: draft.expenseDate.toISOString(),
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
