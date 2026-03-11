import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export type OfflineEntity = 'donor' | 'donation' | 'expense';
export type OfflineOp = 'create' | 'update' | 'delete';
export type OfflineStatus = 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED';

export class OfflineMutationModel extends Model {
  static table = 'offline_mutations';

  @field('op_id') opId!: string;
  @field('entity') entity!: OfflineEntity;
  @field('op') op!: OfflineOp;
  @field('payload_json') payloadJson!: string;
  @field('status') status!: OfflineStatus;
  @field('retry_count') retryCount!: number;
  @field('last_attempt_at') lastAttemptAtMs!: number | null;
  @field('error') error!: string | null;
  @field('created_at') createdAtMs!: number;

  get payload(): unknown {
    try {
      return JSON.parse(this.payloadJson);
    } catch {
      return null;
    }
  }
}
