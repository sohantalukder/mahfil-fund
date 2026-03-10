import { Q } from '@nozbe/watermelondb';
import { database } from '@/services/db/database';
import { uuid } from '@mahfil/utils';

export type ExpenseDraft = {
  eventId: string;
  title: string;
  category: string;
  amount: number;
  expenseDate: Date;
};

export async function listExpensesForEvent(eventId: string) {
  const collection = database.collections.get('expenses');
  return collection
    .query(Q.where('event_id', eventId), Q.sortBy('expense_date', Q.desc))
    .fetch();
}

export async function createExpenseOffline(draft: ExpenseDraft) {
  const expenses = database.collections.get('expenses');
  const mutations = database.collections.get('offline_mutations');
  const clientGeneratedId = uuid();
  const opId = uuid();
  const now = Date.now();

  await database.write(async () => {
    await expenses.create((e: any) => {
      e.serverId = null;
      e.clientGeneratedId = clientGeneratedId;
      e.eventId = draft.eventId;
      e.title = draft.title;
      e.category = draft.category;
      e.amount = draft.amount;
      e.expenseDateMs = draft.expenseDate.getTime();
      e.syncState = 'PENDING';
      e.updatedAtMs = now;
    });

    await mutations.create((m: any) => {
      m.opId = opId;
      m.entity = 'expense';
      m.op = 'create';
      m.payloadJson = JSON.stringify({
        eventId: draft.eventId,
        title: draft.title,
        category: draft.category,
        amount: draft.amount,
        expenseDate: draft.expenseDate.toISOString(),
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

