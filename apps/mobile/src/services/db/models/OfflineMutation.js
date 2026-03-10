var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';
export class OfflineMutationModel extends Model {
    get payload() {
        try {
            return JSON.parse(this.payloadJson);
        }
        catch {
            return null;
        }
    }
}
OfflineMutationModel.table = 'offline_mutations';
__decorate([
    field('op_id')
], OfflineMutationModel.prototype, "opId", void 0);
__decorate([
    field('entity')
], OfflineMutationModel.prototype, "entity", void 0);
__decorate([
    field('op')
], OfflineMutationModel.prototype, "op", void 0);
__decorate([
    field('payload_json')
], OfflineMutationModel.prototype, "payloadJson", void 0);
__decorate([
    field('status')
], OfflineMutationModel.prototype, "status", void 0);
__decorate([
    field('retry_count')
], OfflineMutationModel.prototype, "retryCount", void 0);
__decorate([
    field('last_attempt_at')
], OfflineMutationModel.prototype, "lastAttemptAtMs", void 0);
__decorate([
    field('error')
], OfflineMutationModel.prototype, "error", void 0);
__decorate([
    field('created_at')
], OfflineMutationModel.prototype, "createdAtMs", void 0);
