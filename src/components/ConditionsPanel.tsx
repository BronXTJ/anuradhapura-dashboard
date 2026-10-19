/** Eight current readings, plus the 24-hour chart that sits below the first screen. */

import { useEffect, useState } from 'react'
import { divisionLabel, type Division } from '../divisions.ts'
import { DISTRICT_CENTER, loadWeather, type HourPoint, type WeatherReading } from '../weather.ts'

const emptyReading: WeatherReading = {
  temperature: '—',
  feelsLike: '—',
  humidity: '—',
  wind: '—',
  rainfall: '—',
  uvIndex: '—',
  aqi: '—',
  pm25: '—',
  aqError: false,
  hourly: [],
}

const REFRESH_MS = 10 * 60 * 1000

export type WeatherPoint = { latitude: number; longitude: number }

function ChipIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </svg>
  )
}

function StatChip({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <article className="stat-chip">
      <div className="stat-chip-label">
        <ChipIcon />
        {label}
      </div>
      <p>
        {value}
        {value !== '—' && unit ? <span>{unit}</span> : null}
      </p>
    </article>
  )
}

function ForecastChart({ points }: { points: HourPoint[] }) {
  const [active, setActive] = useState<number | null>(null)
  if (points.length < 2) return <p className="chart-empty">No hourly forecast yet</p>
  const values = points.flatMap((point) => [point.temp, point.feels])
  const low = Math.min(...values)
  const high = Math.max(...values)
  const span = high - low || 1
  const width = 320
  const height = 120
  const line = (key: 'temp' | 'feels') =>
    points
      .map((point, index) => {
        const x = (index / (points.length - 1)) * width
        const y = 8 + (1 - (point[key] - low) / span) * (height - 16)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  const ticks = [0, 6, 12, 18].filter((index) => index < points.length)
  const hover = active == null ? null : points[active]

  return (
    <div
      className="forecast-chart"
      onMouseLeave={() => setActive(null)}
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
        setActive(Math.round(ratio * (points.length - 1)))
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Temperature and feels-like outlook for the next 24 hours">
        {[0, 1, 2, 3].map((row) => (
          <line key={row} x1="0" x2={width} y1={8 + row * ((height - 16) / 3)} y2={8 + row * ((height - 16) / 3)} />
        ))}
        <polyline className="forecast-temp" points={line('temp')} />
        <polyline className="forecast-feels" points={line('feels')} />
      </svg>
      <div className="forecast-axis">
        {ticks.map((index) => (
          <span key={points[index].label}>{points[index].label}</span>
        ))}
      </div>
      <p className="forecast-legend">
        <span className="forecast-key is-temp">Temp</span>
        <span className="forecast-key is-feels">Feels like</span>
      </p>
      {hover ? (
        <p className="forecast-tip">
          {hover.label} · Temp {hover.temp.toFixed(1)} °C · Feels like {hover.feels.toFixed(1)} °C · Rain {hover.rain.toFixed(1)} mm
        </p>
      ) : null}
    </div>
  )
}

export function useConditions(selected: Division | null, probe: WeatherPoint | null) {
  const [reading, setReading] = useState<WeatherReading>(emptyReading)
  const [readingKey, setReadingKey] = useState<string | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const latitude = probe?.latitude ?? selected?.centerLat ?? DISTRICT_CENTER.latitude
  const longitude = probe?.longitude ?? selected?.centerLon ?? DISTRICT_CENTER.longitude
  const pointKey = probe ? `${latitude.toFixed(4)},${longitude.toFixed(4)}` : (selected?.pcode ?? 'district')
  const status = failedKey === pointKey ? 'error' : readingKey === pointKey ? 'ready' : 'loading'
  const shown = status === 'ready' ? reading : emptyReading

  useEffect(() => {
    const controller = new AbortController()
    let retryTimer = 0
    const load = () => {
      void loadWeather(latitude, longitude, controller.signal)
        .then((next) => {
          if (controller.signal.aborted) return
          setReading(next)
          setReadingKey(pointKey)
          setFailedKey(null)
          setUpdatedAt(new Date())
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          console.error(error)
          setFailedKey(pointKey)
          retryTimer = window.setTimeout(load, 8000)
        })
    }
    load()
    const timer = window.setInterval(load, REFRESH_MS)
    return () => {
      controller.abort()
      window.clearTimeout(retryTimer)
      window.clearInterval(timer)
    }
  }, [pointKey, latitude, longitude])

  return { status, shown, updatedAt, latitude, longitude, selected, probed: probe != null }
}

export function ConditionsSummary({ state }: { state: ReturnType<typeof useConditions> }) {
  const { status, shown, latitude, longitude, selected, probed } = state
  return (
    <section className={status === 'loading' ? 'conditions is-loading' : 'conditions'} aria-label="Real-time environmental conditions">
      <header className="conditions-head">
        <h2>
          <span className="live-ping-wrap" aria-hidden="true">
            <span className="live-ping" />
            <span className="live-dot-red" />
          </span>
          Real-Time Environmental Conditions
        </h2>
      </header>
      <p className="conditions-place">
        {status === 'loading'
          ? 'Receiving live conditions…'
          : probed || selected
            ? `Showing conditions at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
            : 'Showing conditions at study area center'}
        {status !== 'loading' && selected ? <span> · {divisionLabel(selected)}</span> : null}
      </p>
      {status === 'error' ? (
        <p className="conditions-error">Live weather is unavailable right now.</p>
      ) : (
        <>
          <div className="chip-row">
            <StatChip label="Temperature" value={shown.temperature} unit="°C" />
            <StatChip label="Feels like" value={shown.feelsLike} unit="°C" />
            <StatChip label="Humidity" value={shown.humidity} unit="%" />
            <StatChip label="Wind" value={shown.wind} unit="km/h" />
          </div>
          <div className="chip-row">
            <StatChip label="Rainfall" value={shown.rainfall} unit="mm" />
            <StatChip label="UV index" value={shown.uvIndex} unit="" />
            <StatChip label="AQI" value={shown.aqi} unit="" />
            <StatChip label="PM2.5" value={shown.pm25} unit="µg/m³" />
          </div>
          {status === 'ready' && shown.aqError ? (
            <p className="conditions-note">Air quality is temporarily unavailable. Weather is still shown.</p>
          ) : null}
        </>
      )}
    </section>
  )
}

export function ConditionsOutlook({ state }: { state: ReturnType<typeof useConditions> }) {
  const { status, shown, updatedAt } = state
  return (
    <section className="outlook-block" aria-label="Next 24 hours">
      <div className="outlook">
        <h3>Next 24 Hours</h3>
        <p>Temperature and feels-like outlook (Asia/Colombo)</p>
        {status === 'error' ? null : <ForecastChart points={shown.hourly} />}
      </div>
      <footer className="conditions-foot">
        {updatedAt ? <p>Updated {updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p> : null}
        <p>Sources: Open-Meteo Weather · Open-Meteo Air Quality. Modelled forecast, not a station reading.</p>
      </footer>
    </section>
  )
}
