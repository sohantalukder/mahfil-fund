export default function Home() {
  return (
    <main className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Mahfil Fund</h1>
          <p>Choose a module to manage donors, donations, expenses, and reports.</p>
        </div>
      </div>
      <div className="card-grid">
        <a className="card" href="/dashboard">
          <div className="card-header">
            <span className="card-title">Dashboard</span>
          </div>
          <div className="card-value" style={{ fontSize: 18 }}>
            Event overview
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
            Collection, expenses, balance, and key counts for the active Mahfil.
          </p>
        </a>
        <a className="card" href="/events">
          <div className="card-header">
            <span className="card-title">Events</span>
          </div>
          <div className="card-value" style={{ fontSize: 18 }}>
            Annual campaigns
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
            Configure Mahfil / Iftar events and set the active year.
          </p>
        </a>
        <a className="card" href="/donors">
          <div className="card-header">
            <span className="card-title">Donors</span>
          </div>
          <div className="card-value" style={{ fontSize: 18 }}>
            People & families
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
            Manage donor profiles, contact details, and categories.
          </p>
        </a>
        <a className="card" href="/donations">
          <div className="card-header">
            <span className="card-title">Donations</span>
          </div>
          <div className="card-value" style={{ fontSize: 18 }}>
            Incoming funds
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
            View and add donations for the current event.
          </p>
        </a>
        <a className="card" href="/expenses">
          <div className="card-header">
            <span className="card-title">Expenses</span>
          </div>
          <div className="card-value" style={{ fontSize: 18 }}>
            Event costs
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
            Track purchases and operational expenses against the fund.
          </p>
        </a>
      </div>
    </main>
  );
}
