import { useCallback, useState } from 'react';
import {
  listDonationsForEvent,
  createDonationOffline,
} from '../donationRepository';

export type DonationListItem = {
  id: string;
  donorName: string;
  amount: number;
  paymentMethod: string;
  donationDateMs: number;
  syncState: string;
};

export function useDonationList() {
  const [eventId, setEventId] = useState('');
  const [items, setItems] = useState<DonationListItem[]>([]);
  const [amount, setAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listDonationsForEvent(eventId);
      setItems(data as unknown as DonationListItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const addDonation = useCallback(async () => {
    if (!eventId) {
      setError('Event ID required');
      return;
    }
    setError(null);
    const value = Number(amount);
    if (!value || Number.isNaN(value)) {
      setError('Amount must be a number');
      return;
    }
    setLoading(true);
    try {
      await createDonationOffline({
        eventId,
        donorLocalId: 'local',
        donorName: donorName || 'Unknown',
        amount: value,
        paymentMethod: 'CASH',
        donationDate: new Date(),
      });
      setAmount('');
      setDonorName('');
      const data = await listDonationsForEvent(eventId);
      setItems(data as unknown as DonationListItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [eventId, amount, donorName]);

  return {
    eventId,
    setEventId,
    items,
    amount,
    setAmount,
    donorName,
    setDonorName,
    error,
    setError,
    loading,
    load,
    addDonation,
  };
}
