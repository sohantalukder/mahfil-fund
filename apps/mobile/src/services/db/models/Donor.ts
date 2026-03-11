import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export type LocalSyncStatus = 'SYNCED' | 'PENDING' | 'SYNCING' | 'FAILED';

export class DonorModel extends Model {
  static table = 'donors';

  @field('server_id') serverId!: string | null;
  @field('client_generated_id') clientGeneratedId!: string | null;
  @field('full_name') fullName!: string;
  @field('phone') phone!: string;
  @field('donor_type') donorType!: string;
  @field('preferred_language') preferredLanguage!: string;
  @field('tags_json') tagsJson!: string;
  @field('sync_status') syncState!: LocalSyncStatus;
  @field('updated_at') updatedAtMs!: number;

  get tags(): string[] {
    try {
      return JSON.parse(this.tagsJson || '[]');
    } catch {
      return [];
    }
  }
}
