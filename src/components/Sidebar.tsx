export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <p className="brand-kicker">Urban Analytics</p>
        <p className="brand-title">Dashboard</p>
        <p className="brand-place">Anuradhapura District</p>
      </div>
      <nav aria-label="Primary">
        <button type="button" className="nav-item" aria-current="page">
          Overview
        </button>
      </nav>
    </aside>
  )
}
