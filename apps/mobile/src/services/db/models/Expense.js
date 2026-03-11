var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';
export class ExpenseModel extends Model {
}
ExpenseModel.table = 'expenses';
__decorate([
    field('server_id')
], ExpenseModel.prototype, "serverId", void 0);
__decorate([
    field('client_generated_id')
], ExpenseModel.prototype, "clientGeneratedId", void 0);
__decorate([
    field('event_id')
], ExpenseModel.prototype, "eventId", void 0);
__decorate([
    field('title')
], ExpenseModel.prototype, "title", void 0);
__decorate([
    field('category')
], ExpenseModel.prototype, "category", void 0);
__decorate([
    field('amount')
], ExpenseModel.prototype, "amount", void 0);
__decorate([
    field('expense_date')
], ExpenseModel.prototype, "expenseDateMs", void 0);
__decorate([
    field('sync_status')
], ExpenseModel.prototype, "syncState", void 0);
__decorate([
    field('updated_at')
], ExpenseModel.prototype, "updatedAtMs", void 0);
