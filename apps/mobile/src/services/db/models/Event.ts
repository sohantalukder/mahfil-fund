import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class EventModel extends Model {
  static table = 'events';

  @field('server_id') serverId!: string | null;
  @field('name') name!: string;
  @field('year') year!: number;
  @field('is_active') isActive!: boolean;
  @field('updated_at') updatedAtMs!: number;
}

