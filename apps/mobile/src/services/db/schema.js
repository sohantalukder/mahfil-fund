import { appSchema, tableSchema } from '@nozbe/watermelondb';
export const schema = appSchema({
    version: 1,
    tables: [
        tableSchema({
            name: 'events',
            columns: [
                {
                    name: 'server_id',
                    type: 'string',
                    isIndexed: true,
                    isOptional: true,
                },
                { name: 'name', type: 'string' },
                { name: 'year', type: 'number', isIndexed: true },
                { name: 'is_active', type: 'boolean' },
                { name: 'updated_at', type: 'number', isIndexed: true },
            ],
        }),
        tableSchema({
            name: 'donors',
            columns: [
                {
                    name: 'server_id',
                    type: 'string',
                    isIndexed: true,
                    isOptional: true,
                },
                {
                    name: 'client_generated_id',
                    type: 'string',
                    isIndexed: true,
                    isOptional: true,
                },
                { name: 'full_name', type: 'string', isIndexed: true },
                { name: 'phone', type: 'string', isIndexed: true },
                { name: 'donor_type', type: 'string' },
                { name: 'preferred_language', type: 'string' },
                { name: 'tags_json', type: 'string' },
                { name: 'sync_status', type: 'string', isIndexed: true },
                { name: 'updated_at', type: 'number', isIndexed: true },
            ],
        }),
        tableSchema({
            name: 'donations',
            columns: [
                {
                    name: 'server_id',
                    type: 'string',
                    isIndexed: true,
                    isOptional: true,
                },
                {
                    name: 'client_generated_id',
                    type: 'string',
                    isIndexed: true,
                    isOptional: true,
                },
                { name: 'event_id', type: 'string', isIndexed: true },
                { name: 'donor_id', type: 'string', isIndexed: true },
                { name: 'donor_name', type: 'string' },
                { name: 'amount', type: 'number' },
                { name: 'payment_method', type: 'string' },
                { name: 'donation_date', type: 'number', isIndexed: true },
                { name: 'sync_status', type: 'string', isIndexed: true },
                { name: 'updated_at', type: 'number', isIndexed: true },
            ],
        }),
        tableSchema({
            name: 'expenses',
            columns: [
                {
                    name: 'server_id',
                    type: 'string',
                    isIndexed: true,
                    isOptional: true,
                },
                {
                    name: 'client_generated_id',
                    type: 'string',
                    isIndexed: true,
                    isOptional: true,
                },
                { name: 'event_id', type: 'string', isIndexed: true },
                { name: 'title', type: 'string' },
                { name: 'category', type: 'string', isIndexed: true },
                { name: 'amount', type: 'number' },
                { name: 'expense_date', type: 'number', isIndexed: true },
                { name: 'sync_status', type: 'string', isIndexed: true },
                { name: 'updated_at', type: 'number', isIndexed: true },
            ],
        }),
        tableSchema({
            name: 'offline_mutations',
            columns: [
                { name: 'op_id', type: 'string', isIndexed: true },
                { name: 'entity', type: 'string', isIndexed: true },
                { name: 'op', type: 'string' },
                { name: 'payload_json', type: 'string' },
                { name: 'status', type: 'string', isIndexed: true },
                { name: 'retry_count', type: 'number' },
                { name: 'last_attempt_at', type: 'number', isOptional: true },
                { name: 'error', type: 'string', isOptional: true },
                { name: 'created_at', type: 'number', isIndexed: true },
            ],
        }),
        tableSchema({
            name: 'app_meta',
            columns: [
                { name: 'key', type: 'string', isIndexed: true },
                { name: 'value', type: 'string' },
            ],
        }),
    ],
});
