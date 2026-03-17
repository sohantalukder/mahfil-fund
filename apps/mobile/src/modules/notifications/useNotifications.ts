import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApi } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCommunity } from '@/contexts/CommunityContext';
import { MMKV } from 'react-native-mmkv';
import type { NotificationItem } from './types';

const notifStore = new MMKV({ id: 'mahfil-notifications' });
const READ_IDS_KEY = 'readNotificationIds';

function getReadIds(): Set<string> {
  const raw = notifStore.getString(READ_IDS_KEY);
  return new Set(raw ? (JSON.parse(raw) as string[]) : []);
}

export function markAllAsRead(ids: string[]) {
  const current = getReadIds();
  ids.forEach((id) => current.add(id));
  notifStore.set(READ_IDS_KEY, JSON.stringify([...current]));
}

const fmtBDT = (n: number) =>
  `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

type Donation = {
  id: string;
  amount: number;
  donationDate: string;
  createdAt: string;
  donorSnapshotName?: string;
  donorName?: string;
};

type Expense = {
  id: string;
  amount: number;
  title: string;
  expenseDate: string;
  createdAt: string;
};

export function useNotifications() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { activeCommunity } = useCommunity();
  const readIds = getReadIds();

  const { data: donations, isLoading: loadingDonations } = useQuery<Donation[]>({
    queryKey: ['notifications-donations', activeCommunity?.id],
    queryFn: async () => {
      const api = getApi();
      const res = await api.get('/donations?scope=community&limit=20');
      if (res && typeof res === 'object' && 'data' in res) {
        const d = res.data as { items?: Donation[] } | Donation[];
        return Array.isArray(d) ? d : (d.items ?? []);
      }
      return Array.isArray(res) ? (res as Donation[]) : [];
    },
    enabled: !!session && !!activeCommunity?.id,
  });

  const { data: expenses, isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ['notifications-expenses', activeCommunity?.id],
    queryFn: async () => {
      const api = getApi();
      const res = await api.get('/expenses?limit=20');
      if (res && typeof res === 'object' && 'data' in res) {
        const d = res.data as { items?: Expense[] } | Expense[];
        return Array.isArray(d) ? d : (d.items ?? []);
      }
      return Array.isArray(res) ? (res as Expense[]) : [];
    },
    enabled: !!session && !!activeCommunity?.id,
  });

  const notifications: NotificationItem[] = useMemo(() => {
    const items: NotificationItem[] = [];

    (donations ?? []).forEach((d) => {
      const id = `donation-${d.id}`;
      const donorName = d.donorSnapshotName ?? d.donorName ?? t('notifications.donation_received').split(' ')[0] ?? 'Anonymous';
      items.push({
        id,
        type: 'donation',
        title: t('notifications.donation_received'),
        body: `${donorName} ${t('common.currency_symbol')}${fmtBDT(d.amount).replace('৳', '')}.`,
        createdAt: d.donationDate || d.createdAt,
        isRead: readIds.has(id),
      });
    });

    (expenses ?? []).forEach((e) => {
      const id = `expense-${e.id}`;
      items.push({
        id,
        type: 'expense',
        title: t('notifications.expense_logged'),
        body: `${e.title} — ${fmtBDT(e.amount)}.`,
        createdAt: e.expenseDate || e.createdAt,
        isRead: readIds.has(id),
      });
    });

    // Sort by date descending
    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return items;
  }, [donations, expenses, readIds, t]);

  return {
    notifications,
    isLoading: loadingDonations || loadingExpenses,
  };
}

export function groupByDay(
  items: NotificationItem[],
  t: (key: string) => string,
): { title: string; data: NotificationItem[] }[] {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();
  const todayItems = items.filter(
    (n) => new Date(n.createdAt).toDateString() === today,
  );
  const yesterdayItems = items.filter(
    (n) => new Date(n.createdAt).toDateString() === yesterday,
  );
  const older = items.filter((n) => {
    const d = new Date(n.createdAt).toDateString();
    return d !== today && d !== yesterday;
  });
  const sections: { title: string; data: NotificationItem[] }[] = [];
  if (todayItems.length) sections.push({ title: t('notifications.section_today'), data: todayItems });
  if (yesterdayItems.length) sections.push({ title: t('notifications.section_yesterday'), data: yesterdayItems });
  if (older.length) sections.push({ title: t('common.earlier'), data: older });
  return sections;
}
