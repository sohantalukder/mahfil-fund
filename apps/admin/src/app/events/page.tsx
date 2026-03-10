'use client';

export default function EventsAdminPage() {
  return (
    <main className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Events</h1>
          <p>Admin-only controls for creating and activating Mahfil events.</p>
        </div>
      </div>
      <div className="card">
        <div className="section-header">
          <div>
            <div className="section-title">Event management</div>
            <div className="section-subtitle">Admin counterpart of the Settings &amp; Event Management screen.</div>
          </div>
        </div>
        <p className="muted">
          In a full implementation, this screen would show a list of years with options to create, edit, and activate an
          event. For now, it acts as a visual shell matching the Stitch Admin Dashboard design.
        </p>
      </div>
    </main>
  );
}

