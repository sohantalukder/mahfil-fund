## Stitch Dashboard mapping

This folder contains local assets and mappings for the **Stitch \"Dashboard\" project** for Mahfil Fund.

- Project: `Dashboard`
- Stitch project URL: `https://stitch.withgoogle.com/projects/8850211240182134696`

### Files

- `manifest.json`: list of all 16 Stitch screens with IDs, human names, slugs, and desired local asset filenames.
- `routes.json`: mapping from Stitch screen IDs to Mahfil Fund routes:
  - `webPath`: path in the public web app (`apps/web`).
  - `adminPath`: path in the admin portal (`apps/admin`).
  - `mobileRoute`: logical route/screen name in the React Native app (`apps/mobile`).
- `download-assets.sh`: helper script that uses `curl -L` to download images/code for each screen once `imageUrl` and `codeUrl` are filled in the manifest.
- `images/`: downloaded PNG/JPEG previews per screen.
- `code/`: any code snippets exported from Stitch for reference.

### Screen → route overview

The table below summarizes the key mapping (see `routes.json` for the exact JSON form).

| # | Stitch screen | ID | Web route (`apps/web`) | Admin route (`apps/admin`) | Mobile route (`apps/mobile`) |
|---|---------------|----|------------------------|-----------------------------|-------------------------------|
| 1 | Settings & Event Management | `1988deee…0229` | `/settings/events` | `/settings/events` | `SettingsEvents` |
| 2 | Summary Details (Light Mode) | `269ed037…000a` | `/dashboard/summary` | `/admin/summary` | `SummaryDetails` |
| 3 | Financial Summary (Light Mode) | `32829c76…02b` | `/financial-summary` | `/admin/financial-summary` | `FinancialSummary` |
| 4 | Donor List (Light Mode) | `92b09f04…e03a` | `/donors` | `/admin/donors` | `DonorList` |
| 5 | Add Expense (Light Mode) | `a081482c…0955` | `/expenses/new` | `/admin/expenses/new` | `AddExpense` |
| 6 | Reports (Light Mode) | `a2f270a5…2d63` | `/reports` | `/admin/reports` | `Reports` |
| 7 | Expense List with Search | `b64ed7ca…5bcf` | `/expenses` | `/admin/expenses` | `ExpenseList` |
| 8 | Expense List (Light Mode) | `c26e5b22…52a` | `/expenses` | `/admin/expenses` | `ExpenseListCompact` |
| 9 | Dashboard (Light Mode) | `debef0aa…08a2` | `/dashboard` | `/admin/dashboard` | `Dashboard` |
| 10 | Add Donation (Light Mode) | `e06a191d…44b` | `/donations/new` | `/admin/donations/new` | `AddDonation` |
| 11 | Financial Summary & Reports | `525186c4…bd2d` | `/financials` | `/admin/financials` | `FinancialOverview` |
| 12 | Settings - Import Success Notification | `8cf9a0ab…58e` | `/settings/import` | `/admin/settings/import` | `SettingsImport` |
| 13 | Settings with Cloud Sync | `ec180533…73b` | `/settings/cloud-sync` | `/admin/settings/cloud-sync` | `CloudSyncSettings` |
| 14 | Admin Dashboard (Web) | `f32f55e1…b11a` | `/dashboard` | `/admin/dashboard` | `AdminDashboardReference` |
| 15 | Donor Management Portal (Web) | `b21f377a…91f9` | `/donors` | `/admin/donors` | `DonorManagementReference` |
| 16 | Expense Management Portal (Web) | `5c8290c5…51c5` | `/expenses` | `/admin/expenses` | `ExpenseManagementReference` |

### Using `download-assets.sh`

1. Edit `manifest.json` and fill in `imageUrl` and `codeUrl` for each screen using URLs from Stitch.
2. From the repo root, run:

   ```bash
   bash design/stitch/dashboard/download-assets.sh
   ```

3. The script uses `curl -L` to download all assets into `images/` and `code/`.

