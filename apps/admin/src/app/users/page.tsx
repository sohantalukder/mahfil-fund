'use client';

export default function UsersPage() {
  return (
    <main className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Users</h1>
          <p>Admin-only screen to manage staff and access roles.</p>
        </div>
      </div>
      <div className="card">
        <div className="section-header">
          <div>
            <div className="section-title">User management</div>
            <div className="section-subtitle">Admin dashboard user management overview.</div>
          </div>
        </div>
        <p className="muted">
          The detailed user list, invitations, and role editing UI will be wired to the API in a later iteration.
        </p>
      </div>
    </main>
  );
}

