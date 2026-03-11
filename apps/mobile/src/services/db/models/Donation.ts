import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';
import type { LocalSyncStatus } from './Donor';

export class DonationModel extends Model {
  static table = 'donations';

  @field('server_id') serverId!: string | null;
  @field('client_generated_id') clientGeneratedId!: string | null;
  @field('event_id') eventId!: string;
  @field('donor_id') donorId!: string;
  @field('donor_name') donorName!: string;
  @field('amount') amount!: number;
  @field('payment_method') paymentMethod!: string;
  @field('donation_date') donationDateMs!: number;
  @field('sync_status') syncState!: LocalSyncStatus;
  @field('updated_at') updatedAtMs!: number;
}
