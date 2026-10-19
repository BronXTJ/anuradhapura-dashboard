/** Seven census cards. The last three use the warm accent. */

import { useEffect, useState } from 'react'
import type { DivisionMode } from '../divisions.ts'
import { loadStats, type StatCatalog, type StatRecord } from '../stats.ts'

type StatGridProps = {
  mode: DivisionMode
  selectedPcode: string | null
}

const numberFormat = new Intl.NumberFormat('en-US')
const decimalFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function recordFor(catalog: StatCatalog, mode: DivisionMode, selectedPcode: string | null): StatRecord | null {
  if (!selectedPcode) return catalog.district
  return (mode === 'ds' ? catalog.ds : catalog.gn).get(selectedPcode) ?? null
}

type Card = { label: string; value: string; unit?: string; warm?: boolean; icon: 'pin' | 'hash' | 'area' | 'people' | 'density' | 'home' | 'homes' }

function cardsFor(record: StatRecord | null): Card[] {
  const missing = '—'
  return [
    { label: 'Name', value: record?.name ?? missing, icon: 'pin' },
    { label: 'Code', value: record?.pcode ?? missing, icon: 'hash' },
    { label: 'Land area', value: record ? decimalFormat.format(record.area_sqkm) : missing, unit: 'km²', icon: 'area' },
    { label: 'Population', value: record ? numberFormat.format(record.population) : missing, icon: 'people' },
    {
      label: 'Population density',
      value: record ? decimalFormat.format(record.population_density) : missing,
      unit: 'per km²',
      warm: true,
      icon: 'density',
    },
    { label: 'Housing units', value: record ? numberFormat.format(record.housing) : missing, warm: true, icon: 'home' },
    {
      label: 'Housing density',
      value: record ? decimalFormat.format(record.housing_density) : missing,
      unit: 'per km²',
      warm: true,
      icon: 'homes',
    },
  ]
}

function CardIcon({ name }: { name: Card['icon'] }) {
  if (name === 'pin') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.2" />
      </svg>
    )
  }
  if (name === 'hash') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16" /></svg>
  if (name === 'area') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
  if (name === 'people') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="2.2" />
        <circle cx="16" cy="9" r="1.8" />
        <path d="M4.5 18c.6-2.4 2.4-3.6 4.5-3.6s3.9 1.2 4.5 3.6M14 14.6c1.4-.4 2.8 0 3.8 1.6" />
      </svg>
    )
  }
  if (name === 'density') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="2" /><circle cx="16" cy="9" r="2" /><circle cx="12" cy="16" r="2" /></svg>
  if (name === 'home') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11 12 4l8 7v8H4v-8z" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 8 6l5 5v7H3v-7zM13 11l4-4 4 4v7h-8v-7z" /></svg>
}

export function StatGrid({ mode, selectedPcode }: StatGridProps) {
  const [catalog, setCatalog] = useState<StatCatalog | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadStats()
      .then((loaded) => {
        if (!cancelled) setCatalog(loaded)
      })
      .catch((error: unknown) => console.error(error))
    return () => {
      cancelled = true
    }
  }, [])

  const record = catalog ? recordFor(catalog, mode, selectedPcode) : null

  return (
    <section className="stats" aria-label="Division statistics">
      {cardsFor(record).map((card) => (
        <article key={card.label} className={card.warm ? 'stat-card is-warm' : 'stat-card'}>
          <div className="stat-card-top">
            <h2>{card.label}</h2>
            <span className="stat-icon">
              <CardIcon name={card.icon} />
            </span>
          </div>
          <p>
            <span className="stat-value">{card.value}</span>
            {card.unit && card.value !== '—' ? <span className="stat-unit">{card.unit}</span> : null}
          </p>
        </article>
      ))}
    </section>
  )
}
