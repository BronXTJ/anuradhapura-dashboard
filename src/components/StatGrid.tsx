const primaryCards = ['Name', 'Code', 'Land area', 'Population']
const secondaryCards = ['Population density', 'Housing units', 'Housing density']

export function StatGrid() {
  return (
    <section className="stats" aria-label="Division statistics">
      <div className="stat-row stat-row-4">
        {primaryCards.map((label) => (
          <article key={label} className="stat-card">
            <h2>{label}</h2>
            <p>—</p>
          </article>
        ))}
      </div>
      <div className="stat-row stat-row-3">
        {secondaryCards.map((label) => (
          <article key={label} className="stat-card">
            <h2>{label}</h2>
            <p>—</p>
          </article>
        ))}
      </div>
    </section>
  )
}
