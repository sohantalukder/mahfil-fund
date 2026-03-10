'use client';

export default function AuditLogsPage() {
  return (
    <main className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Audit logs</h1>
          <p>Admin-only view of actions taken across the system.</p>
        </div>
      </div>
      <div className="card">
        <div className="section-header">
          <div>
            <div className="section-title">Activity history</div>
            <div className="section-subtitle">Filters for entity, action, actor, and date range will be added here.</div>
          </div>
        </div>
        <p className="muted">
          The actual log viewer will be plugged into the API later; this layout focuses on matching the light admin
          dashboard style.
        </p>
      </div>
    </main>
  );
}

