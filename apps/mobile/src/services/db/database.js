import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { EventModel } from './models/Event';
import { DonorModel } from './models/Donor';
import { OfflineMutationModel } from './models/OfflineMutation';
import { AppMetaModel } from './models/AppMeta';
const adapter = new SQLiteAdapter({
    schema,
    dbName: 'mahfil_fund',
    jsi: true,
    onSetUpError: (error) => {
        // eslint-disable-next-line no-console
        console.error('WatermelonDB setup error', error);
    },
});
export const database = new Database({
    adapter,
    modelClasses: [EventModel, DonorModel, OfflineMutationModel, AppMetaModel],
});
