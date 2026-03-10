'use client';

import { useEffect, useMemo, useState } from 'react';
import { getApi } from '@/lib/api';
import type { ApiResponse } from '@mahfil/types';

type Donor = {
  id: string;
  fullName: string;
  phone: string;
  donorType: string;
  status: string;
};

export default function AdminDonorsPage() {
  const api = useMemo(() => getApi(), []);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res: ApiResponse<{ donors: Donor[] }> = await api.get(`/donors${query}`);
    if (!res.success) setError(res.error.message);
    else setDonors(res.data.donors);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Donor management</h1>
          <p>Admin-only portal to review, filter, and clean up donor records.</p>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="field-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or tag"
        />
        <button className="btn btn-primary" type="button" onClick={load}>
          Search
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="card">
        <div className="section-header">
          <div>
            <div className="section-title">Donors</div>
            <div className="section-subtitle">All donors visible to admins.</div>
          </div>
          <div className="badge">{donors.length} results</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {donors.map((d) => (
              <tr key={d.id}>
                <td>{d.fullName}</td>
                <td>{d.phone}</td>
                <td>{d.donorType}</td>
                <td>{d.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

