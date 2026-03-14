import { useCallback, useState } from 'react';
import { createDonorOffline, listDonors } from '../donorRepository';

export type DonorListItem = {
  id: string;
  fullName: string;
  phone: string;
  syncState: string;
};

export function useDonorList() {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<DonorListItem[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const donors = await listDonors(search);
      setItems(donors as unknown as DonorListItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const addDonor = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await createDonorOffline({
        fullName: fullName.trim(),
        phone: phone.trim(),
        donorType: 'individual',
        preferredLanguage: 'bn',
        tags: [],
      });
      setFullName('');
      setPhone('');
      const donors = await listDonors(search);
      setItems(donors as unknown as DonorListItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [fullName, phone, search]);

  return {
    search,
    setSearch,
    items,
    fullName,
    setFullName,
    phone,
    setPhone,
    error,
    loading,
    load,
    addDonor,
  };
}
