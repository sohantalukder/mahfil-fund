'use client';

import { useEffect, useMemo, useState } from 'react';
import { getApi } from '@/lib/api';
import type { ApiResponse } from '@mahfil/types';

type Donor = {
  id: string;
  fullName: string;
  phone: string;
  donorType: string;
  tags: string[];
};

export default function DonorsPage() {
  const api = useMemo(() => getApi(), []);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [search, setSearch] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [donorType, setDonorType] = useState('individual');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res: ApiResponse<{ donors: Donor[] }> = await api.get(`/donors${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    if (!res.success) setError(res.error.message);
    else setDonors(res.data.donors);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addDonor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const res: ApiResponse<{ donor: Donor }> = await api.post('/donors', {
      fullName,
      phone,
      donorType,
      preferredLanguage: 'bn',
      tags: []
    });
    if (!res.success) setError(res.error.message);
    else {
      setFullName('');
      setPhone('');
      await load();
    }
  }

  return (
    <main className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Donor list</h1>
          <p>Light-mode list of all donors with quick search and inline add.</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="toolbar"
      >
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name/phone" />
        <button className="btn btn-primary" type="submit">
          Search
        </button>
      </form>

      <section className="section">
        <div className="layout-columns">
          <form onSubmit={addDonor} className="card" style={{ display: 'grid', gap: 8 }}>
            <div className="section-title">Add donor</div>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" required />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" required />
            <select value={donorType} onChange={(e) => setDonorType(e.target.value)}>
              <option value="individual">Individual</option>
              <option value="family">Family</option>
              <option value="business">Business</option>
              <option value="organization">Organization</option>
            </select>
            <button className="btn btn-primary" type="submit">
              Save donor
            </button>
          </form>

          <div className="card">
            <div className="section-header">
              <div>
                <div className="section-title">Donors</div>
                <div className="section-subtitle">All donors matching your search.</div>
              </div>
              <div className="badge">{donors.length} results</div>
            </div>
            {error && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 10,
                  background: '#fef2f2',
                  color: '#991b1b'
                }}
              >
                {error}
              </div>
            )}
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {donors.map((d) => (
                  <tr key={d.id}>
                    <td>{d.fullName}</td>
                    <td>{d.phone}</td>
                    <td>{d.donorType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

