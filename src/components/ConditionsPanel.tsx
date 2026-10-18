import { useEffect, useState } from 'react'
import { divisionLabel, type Division } from '../divisions.ts'
import { DISTRICT_CENTER, loadWeather, type WeatherReading } from '../weather.ts'

type ConditionsPanelProps = {
  selected: Division | null
}

const emptyReading: WeatherReading = {
  temperature: '—',
  feelsLike: '—',
  humidity: '—',
  wind: '—',
  rainfall: '—',
  uvIndex: '—',
  aqi: '—',
  pm25: '—',
  hourly: [],
}

function chartPoints(values: number[]): string {
  const low = Math.min(...values)
  const high = Math.max(...values)
  const span = high - low || 1
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 320
      const y = 42 - ((value - low) / span) * 34
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export function ConditionsPanel({ selected }: ConditionsPanelProps) {
  const [reading, setReading] = useState<WeatherReading>(emptyReading)
  const [readingKey, setReadingKey] = useState<string | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const pointKey = selected?.pcode ?? 'district'
  const status = failedKey === pointKey ? 'error' : readingKey === pointKey ? 'ready' : 'loading'
  const shown = status === 'ready' ? reading : emptyReading
  const place = selected ? divisionLabel(selected) : 'Anuradhapura District'
  const note = status === 'loading' ? 'Loading' : status === 'error' ? 'Weather unavailable' : place

  useEffect(() => {
    const controller = new AbortController()
    const latitude = selected?.centerLat ?? DISTRICT_CENTER.latitude
    const longitude = selected?.centerLon ?? DISTRICT_CENTER.longitude
    void loadWeather(latitude, longitude, controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return
        setReading(next)
        setReadingKey(pointKey)
        setFailedKey(null)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.error(error)
        setFailedKey(pointKey)
      })
    return () => controller.abort()
  }, [pointKey, selected])

  const items = [
    ['Temperature', shown.temperature],
    ['Feels like', shown.feelsLike],
    ['Humidity', shown.humidity],
    ['Wind', shown.wind],
    ['Rainfall', shown.rainfall],
    ['UV index', shown.uvIndex],
    ['AQI', shown.aqi],
    ['PM2.5', shown.pm25],
  ] as const

  return (
    <section className="conditions" aria-label="Real-time environmental conditions">
      <header className="conditions-head">
        <h2>Real-time environmental conditions</h2>
        <p>{note}</p>
      </header>
      <div className="reading-grid">
        {items.map(([label, value]) => (
          <article key={label} className="reading">
            <h3>{label}</h3>
            <p>{value}</p>
          </article>
        ))}
      </div>
      <div className="outlook">
        <p>Next 24 hours</p>
        <svg viewBox="0 0 320 48" role="img" aria-label="Temperature for the next 24 hours">
          {shown.hourly.length > 1 ? (
            <polyline fill="none" stroke="currentColor" strokeWidth="2" points={chartPoints(shown.hourly)} />
          ) : null}
        </svg>
      </div>
    </section>
  )
}
