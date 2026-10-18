const readings = [
  'Temperature',
  'Feels like',
  'Humidity',
  'Wind',
  'Rainfall',
  'UV index',
  'AQI',
  'PM2.5',
]

export function ConditionsPanel() {
  return (
    <section className="conditions" aria-label="Real-time environmental conditions">
      <header className="conditions-head">
        <h2>Real-time environmental conditions</h2>
        <p>Placeholder readings</p>
      </header>
      <div className="reading-grid">
        {readings.map((label) => (
          <article key={label} className="reading">
            <h3>{label}</h3>
            <p>—</p>
          </article>
        ))}
      </div>
      <div className="outlook">
        <p>Next 24 hours</p>
        <svg viewBox="0 0 320 48" role="img" aria-label="Sample temperature outlook">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            points="0,28 40,26 80,24 120,27 160,22 200,20 240,18 280,16 320,21"
          />
          <polyline
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeDasharray="4 4"
            points="0,18 40,17 80,16 120,19 160,15 200,14 240,12 280,13 320,16"
          />
        </svg>
      </div>
    </section>
  )
}
