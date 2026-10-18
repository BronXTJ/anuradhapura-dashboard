import { useEffect, useState } from 'react'
import type { DivisionMode } from '../divisions.ts'
import { loadStats, type StatCatalog, type StatRecord } from '../stats.ts'

type StatGridProps = {
  mode: DivisionMode
  selectedPcode: string | null
}

const numberFormat = new Intl.NumberFormat('en-US')
const decimalFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function recordFor(catalog: StatCatalog, mode: DivisionMode, selectedPcode: string | null): StatRecord | null {
  if (!selectedPcode) return catalog.district
  return (mode === 'ds' ? catalog.ds : catalog.gn).get(selectedPcode) ?? null
}

function cardsFor(record: StatRecord | null): Array<{ label: string; value: string }> {
  const missing = '—'
  return [
    { label: 'Name', value: record?.name ?? missing },
    { label: 'Code', value: record?.pcode ?? missing },
    { label: 'Land area', value: record ? `${decimalFormat.format(record.area_sqkm)} km²` : missing },
    { label: 'Population', value: record ? numberFormat.format(record.population) : missing },
    {
      label: 'Population density',
      value: record ? `${decimalFormat.format(record.population_density)} per km²` : missing,
    },
    { label: 'Housing units', value: record ? numberFormat.format(record.housing) : missing },
    {
      label: 'Housing density',
      value: record ? `${decimalFormat.format(record.housing_density)} per km²` : missing,
    },
  ]
}

export function StatGrid({ mode, selectedPcode }: StatGridProps) {
  const [catalog, setCatalog] = useState<StatCatalog | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadStats()
      .then((loaded) => {
        if (!cancelled) setCatalog(loaded)
      })
      .catch((error: unknown) => {
        console.error(error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const record = catalog ? recordFor(catalog, mode, selectedPcode) : null
  const cards = cardsFor(record)
  const primary = cards.slice(0, 4)
  const secondary = cards.slice(4)

  return (
    <section className="stats" aria-label="Division statistics">
      <div className="stat-row stat-row-4">
        {primary.map((card) => (
          <article key={card.label} className="stat-card">
            <h2>{card.label}</h2>
            <p>{card.value}</p>
          </article>
        ))}
      </div>
      <div className="stat-row stat-row-3">
        {secondary.map((card) => (
          <article key={card.label} className="stat-card">
            <h2>{card.label}</h2>
            <p>{card.value}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
