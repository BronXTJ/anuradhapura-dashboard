import { useState } from 'react'
import { ConditionsPanel } from './ConditionsPanel.tsx'
import { DivisionSearch } from './DivisionSearch.tsx'
import { StatGrid } from './StatGrid.tsx'
import type { DivisionMode, SampleDivision } from '../sampleDivisions.ts'

export function OverviewPanel() {
  const [mode, setMode] = useState<DivisionMode>('ds')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<SampleDivision | null>(null)

  function changeMode(next: DivisionMode) {
    setMode(next)
    setQuery('')
    setSelected(null)
  }

  const subtitle = selected
    ? `Showing sample ${mode === 'ds' ? 'DS' : 'GN'} division data for ${selected.label}`
    : 'District overview'

  return (
    <section className="overview" aria-label="Overview">
      <header className="overview-head">
        <p className="eyebrow">Primary study area</p>
        <h1>Anuradhapura District</h1>
        <p className="subtitle">{subtitle}</p>
      </header>
      <div className="view-row">
        <div className="mode-switch" role="group" aria-label="View by">
          <button type="button" aria-pressed={mode === 'ds'} onClick={() => changeMode('ds')}>
            DS divisions
          </button>
          <button type="button" aria-pressed={mode === 'gn'} onClick={() => changeMode('gn')}>
            GN divisions
          </button>
        </div>
        <DivisionSearch
          key={mode}
          mode={mode}
          query={query}
          onQueryChange={(value) => {
            setQuery(value)
            setSelected((current) => (current?.label === value ? current : null))
          }}
          onSelect={setSelected}
        />
      </div>
      <StatGrid />
      <ConditionsPanel />
    </section>
  )
}
