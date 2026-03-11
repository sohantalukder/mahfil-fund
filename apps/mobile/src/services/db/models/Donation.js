var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';
export class DonationModel extends Model {
}
DonationModel.table = 'donations';
__decorate([
    field('server_id')
], DonationModel.prototype, "serverId", void 0);
__decorate([
    field('client_generated_id')
], DonationModel.prototype, "clientGeneratedId", void 0);
__decorate([
    field('event_id')
], DonationModel.prototype, "eventId", void 0);
__decorate([
    field('donor_id')
], DonationModel.prototype, "donorId", void 0);
__decorate([
    field('donor_name')
], DonationModel.prototype, "donorName", void 0);
__decorate([
    field('amount')
], DonationModel.prototype, "amount", void 0);
__decorate([
    field('payment_method')
], DonationModel.prototype, "paymentMethod", void 0);
__decorate([
    field('donation_date')
], DonationModel.prototype, "donationDateMs", void 0);
__decorate([
    field('sync_status')
], DonationModel.prototype, "syncState", void 0);
__decorate([
    field('updated_at')
], DonationModel.prototype, "updatedAtMs", void 0);
