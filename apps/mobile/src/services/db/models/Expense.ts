import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';
import type { LocalSyncStatus } from './Donor';

export class ExpenseModel extends Model {
  static table = 'expenses';

  @field('server_id') serverId!: string | null;
  @field('client_generated_id') clientGeneratedId!: string | null;
  @field('event_id') eventId!: string;
  @field('title') title!: string;
  @field('category') category!: string;
  @field('amount') amount!: number;
  @field('expense_date') expenseDateMs!: number;
  @field('sync_status') syncState!: LocalSyncStatus;
  @field('updated_at') updatedAtMs!: number;
}
