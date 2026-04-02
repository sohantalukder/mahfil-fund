import { useMemo, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApi } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCommunity } from '@/contexts/CommunityContext';
import { MMKV } from 'react-native-mmkv';
import type { NotificationItem } from './types';

const notifStore = new MMKV({ id: 'mahfil-notifications' });
const READ_IDS_KEY = 'readNotificationIds';

function loadReadIds(): Set<string> {
  const raw = notifStore.getString(READ_IDS_KEY);
  try {
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Persist read IDs and return the updated set. */
function persistReadIds(ids: string[]): Set<string> {
  const current = loadReadIds();
  ids.forEach((id) => current.add(id));
  notifStore.set(READ_IDS_KEY, JSON.stringify([...current]));
  return current;
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

/** Parse the various shapes the API might return for list responses. */
function parseList<T>(res: unknown): T[] {
  if (!res || typeof res !== 'object') return [];
  if ('data' in (res as object)) {
    const d = (res as { data: unknown }).data;
    if (Array.isArray(d)) return d as T[];
    if (d && typeof d === 'object') {
      const obj = d as Record<string, unknown>;
      return (obj.items ?? obj.donations ?? obj.expenses ?? []) as T[];
    }
  }
  if ('success' in (res as object) && 'data' in (res as object)) {
    const r = res as { success: boolean; data: unknown };
    if (Array.isArray(r.data)) return r.data as T[];
  }
  return [];
}

export function useNotifications() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { activeCommunity } = useCommunity();

  // Track read IDs in React state so marking-as-read triggers a re-render
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);

  const markAllAsRead = useCallback((ids: string[]) => {
    const updated = persistReadIds(ids);
    setReadIds(new Set(updated));
  }, []);

  const { data: donations, isLoading: loadingDonations } = useQuery<Donation[]>({
    queryKey: ['notifications-donations', activeCommunity?.id],
    queryFn: async () => {
      const api = getApi();
      const res = await api.get('/donations?scope=community&limit=20');
      return parseList<Donation>(res);
    },
    enabled: !!session && !!activeCommunity?.id,
  });

  const { data: expenses, isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ['notifications-expenses', activeCommunity?.id],
    queryFn: async () => {
      const api = getApi();
      const res = await api.get('/expenses?limit=20');
      return parseList<Expense>(res);
    },
    enabled: !!session && !!activeCommunity?.id,
  });

  const notifications: NotificationItem[] = useMemo(() => {
    const items: NotificationItem[] = [];

    (donations ?? []).forEach((d) => {
      const id = `donation-${d.id}`;
      const donorName =
        d.donorSnapshotName ?? d.donorName ?? 'Anonymous';
      items.push({
        id,
        type: 'donation',
        title: t('notifications.donation_received'),
        body: `${donorName} — ${fmtBDT(d.amount)}`,
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
        body: `${e.title} — ${fmtBDT(e.amount)}`,
        createdAt: e.expenseDate || e.createdAt,
        isRead: readIds.has(id),
      });
    });

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return items;
  }, [donations, expenses, readIds, t]);

  return {
    notifications,
    isLoading: loadingDonations || loadingExpenses,
    markAllAsRead,
  };
}

export function groupByDay(
  items: NotificationItem[],
  t: (key: string) => string,
): { title: string; data: NotificationItem[] }[] {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();

  const todayItems = items.filter((n) => new Date(n.createdAt).toDateString() === today);
  const yesterdayItems = items.filter(
    (n) => new Date(n.createdAt).toDateString() === yesterday,
  );
  const older = items.filter((n) => {
    const d = new Date(n.createdAt).toDateString();
    return d !== today && d !== yesterday;
  });

  const sections: { title: string; data: NotificationItem[] }[] = [];
  if (todayItems.length) sections.push({ title: t('notifications.section_today'), data: todayItems });
  if (yesterdayItems.length)
    sections.push({ title: t('notifications.section_yesterday'), data: yesterdayItems });
  if (older.length) sections.push({ title: t('common.earlier'), data: older });
  return sections;
}
