var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';
export class DonorModel extends Model {
    get tags() {
        try {
            return JSON.parse(this.tagsJson || '[]');
        }
        catch {
            return [];
        }
    }
}
DonorModel.table = 'donors';
__decorate([
    field('server_id')
], DonorModel.prototype, "serverId", void 0);
__decorate([
    field('client_generated_id')
], DonorModel.prototype, "clientGeneratedId", void 0);
__decorate([
    field('full_name')
], DonorModel.prototype, "fullName", void 0);
__decorate([
    field('phone')
], DonorModel.prototype, "phone", void 0);
__decorate([
    field('donor_type')
], DonorModel.prototype, "donorType", void 0);
__decorate([
    field('preferred_language')
], DonorModel.prototype, "preferredLanguage", void 0);
__decorate([
    field('tags_json')
], DonorModel.prototype, "tagsJson", void 0);
__decorate([
    field('sync_status')
], DonorModel.prototype, "syncState", void 0);
__decorate([
    field('updated_at')
], DonorModel.prototype, "updatedAtMs", void 0);
