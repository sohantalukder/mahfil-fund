'use client';

export default function SettingsPage() {
  return (
    <main className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Settings</h1>
          <p>Configure event management, imports, and cloud sync.</p>
        </div>
      </div>

      <div className="layout-columns">
        <section className="card">
          <div className="section-header">
            <div>
              <div className="section-title">Event management</div>
              <div className="section-subtitle">Control which Mahfil event is active.</div>
            </div>
          </div>
          <p className="muted">
            The full event management UI (create, close, archive) lives in the admin portal. Here you&apos;ll see a
            read-only summary of the active event.
          </p>
        </section>

        <section className="card">
          <div className="section-header">
            <div>
              <div className="section-title">Cloud sync</div>
              <div className="section-subtitle">Keep web and mobile data in sync.</div>
            </div>
          </div>
          <p className="muted">
            Cloud sync is handled by the API and mobile offline sync engine. Web users always see the latest data when
            online.
          </p>
        </section>
      </div>
    </main>
  );
}

