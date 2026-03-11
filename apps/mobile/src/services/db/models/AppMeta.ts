import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class AppMetaModel extends Model {
  static table = 'app_meta';

  @field('key') key!: string;
  @field('value') value!: string;
}
